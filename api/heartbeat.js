// Heartbeat endpoint - GET isteği ile IP adresi ile online kontrol
// Network'ten görünür - Response gelirse kullanıcı online sayılır
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    // CORS headers - Her zaman gönder
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed',
            status: 'error'
        });
    }

    try {
        // Source parametresini al (index veya admin)
        const source = req.query.source || 'unknown';
        
        // IP adresini request'ten al (Vercel proxy'leri için)
        const forwarded = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];
        const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare için
        const ip = cfConnectingIp || (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
        
        // Browser bilgilerini al
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // Unique user identifier - IP + Browser
        const userFingerprint = `${ip}-${userAgent.substring(0, 50)}`;

        const now = new Date();
        
        console.log('💓 Heartbeat alındı - Source:', source, 'IP:', ip, 'UserAgent:', userAgent.substring(0, 30));
        console.log('🔍 IP adresi detayları:', {
            cfConnectingIp: cfConnectingIp,
            forwarded: forwarded,
            realIp: realIp,
            socketRemoteAddress: req.socket?.remoteAddress,
            connectionRemoteAddress: req.connection?.remoteAddress,
            finalIp: ip
        });
        
        let db;
        try {
            const dbResult = await connectToDatabase();
            db = dbResult.db;

            const result = await db.collection('userSessions').updateOne(
                { ip: ip },
                {
                    $set: {
                        userId: ip,
                        userFingerprint: userFingerprint,
                        lastSeen: now,
                        userAgent: userAgent,
                        ip: ip,
                        isOnline: true,
                        lastResponseAt: now,
                        lastSource: source
                    },
                    $setOnInsert: {
                        createdAt: now
                    },
                    $inc: { requestCount: 1 }
                },
                { upsert: true }
            );

            console.log('✅ Heartbeat kaydedildi (' + source + ') - MongoDB:', result.modifiedCount > 0 ? 'güncellendi' : 'yeni kayıt');
            console.log('📊 DB:', db.databaseName, 'Collection:', 'userSessions');

            if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
                try {
                    function getDeviceType(ua) {
                        if (!ua) return 'Unknown';
                        const uaLower = ua.toLowerCase();
                        if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
                            return 'iOS';
                        } else if (uaLower.includes('android')) {
                            return 'Android';
                        } else if (uaLower.includes('windows')) {
                            return 'Windows';
                        } else if (uaLower.includes('mac')) {
                            return 'macOS';
                        } else if (uaLower.includes('linux')) {
                            return 'Linux';
                        } else {
                            return 'Unknown';
                        }
                    }

                    const deviceType = getDeviceType(userAgent);

                    const visitorResult = await db.collection('visitors').updateOne(
                        { ip: ip },
                        {
                            $set: {
                                ip: ip,
                                userAgent: userAgent,
                                deviceType: deviceType,
                                lastVisit: now,
                                lastSource: source
                            },
                            $setOnInsert: {
                                firstVisit: now
                            },
                            $inc: { visitCount: 1 }
                        },
                        { upsert: true }
                    );

                    console.log('📊 Visitor kayıt sonucu:', {
                        matched: visitorResult.matchedCount,
                        modified: visitorResult.modifiedCount,
                        upserted: visitorResult.upsertedCount,
                        ip: ip,
                        source: source
                    });
                } catch (visitorError) {
                    console.error('❌ Visitor kaydı hatası:', visitorError);
                }
            } else {
                console.warn('⚠️ Visitor kaydı atlandı - Geçersiz IP adresi:', ip);
            }
                
            // Aktif kullanıcı sayısını stats collection'ına kaydet
            try {
                const sevenSecondsAgo = new Date(now.getTime() - 7 * 1000);
                const eightSecondsAgo = new Date(now.getTime() - 8 * 1000);

                const activeFilter = {
                    $or: [
                        { lastResponseAt: { $gte: sevenSecondsAgo } },
                        {
                            $and: [
                                { lastResponseAt: { $exists: false } },
                                { lastSeen: { $gte: sevenSecondsAgo } }
                            ]
                        }
                    ]
                };

                const activeUsers = await db.collection('userSessions').countDocuments(activeFilter);
                console.log('✅ Aktif kullanıcı sayısı (7 saniye içinde):', activeUsers);

                const pruneFilter = {
                    $and: [
                        { lastSeen: { $lt: eightSecondsAgo } },
                        {
                            $or: [
                                { lastResponseAt: { $lt: eightSecondsAgo } },
                                { lastResponseAt: { $exists: false } }
                            ]
                        }
                    ]
                };

                const deleteResult = await db.collection('userSessions').deleteMany(pruneFilter);
                if (deleteResult.deletedCount > 0) {
                    console.log('🗑️ Offline kullanıcılar temizlendi (7+ saniye heartbeat yok):', deleteResult.deletedCount);
                }

                const statsResult = await db.collection('stats').updateOne(
                    { _id: 'current' },
                    {
                        $set: {
                            activeUsers: activeUsers,
                            lastUpdated: now
                        },
                        $setOnInsert: {
                            totalCarts: 0,
                            totalPurchases: 0,
                            createdAt: now
                        }
                    },
                    { upsert: true }
                );
                
                console.log('✅ Stats güncellendi - modified:', statsResult.modifiedCount, 'upserted:', statsResult.upsertedCount);
                
                } catch (statsError) {
                    console.error('❌ Stats güncellenemedi:', statsError);
                }
            }
            
        } catch (dbError) {
            console.error('❌ MongoDB hatası:', dbError);
            // MongoDB hatası olsa bile response döndür
        }
        
        // Response gönder - Her zaman OK döndür (kullanıcı online sayılır)
        return res.status(200).json({ 
            success: true, 
            status: 'ok',
            timestamp: now.toISOString(),
            ip: ip,
            userFingerprint: userFingerprint,
            message: 'Heartbeat OK - User online'
        });
        
    } catch (error) {
        console.error('❌ Heartbeat GET error:', error);
        // Hata olsa bile 200 döndür - kullanıcı online sayılır
        return res.status(200).json({ 
            success: false,
            status: 'ok', // Kullanıcı online sayılır
            error: error.message,
            message: 'Heartbeat received but error occurred'
        });
    }
};


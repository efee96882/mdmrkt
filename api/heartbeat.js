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
        
        // MongoDB bağlantısını dene - Sadece index.html'den gelen heartbeat'leri kaydet
        let db;
        try {
            // Sadece source=index olanları userSessions'a kaydet
            if (source === 'index') {
                const dbResult = await connectToDatabase();
                db = dbResult.db;
                
                // Kullanıcı aktivitesini kaydet/güncelle - IP bazında unique (1 IP = 1 kullanıcı)
                // IP adresi unique identifier olarak kullanılıyor, user agent fark etmiyor
                const result = await db.collection('userSessions').updateOne(
                { ip: ip }, // IP adresi unique identifier
                {
                    $set: {
                        userId: ip, // IP adresi userId olarak
                        userFingerprint: userFingerprint, // Metadata olarak saklanıyor
                        lastSeen: now,
                        userAgent: userAgent, // En son user agent saklanıyor
                        ip: ip,
                        isOnline: true,
                        lastResponseAt: now
                    },
                    $setOnInsert: {
                        createdAt: now
                    },
                    $inc: { requestCount: 1 }
                },
                { upsert: true }
            );
                
                console.log('✅ Heartbeat kaydedildi (index.html) - MongoDB:', result.modifiedCount > 0 ? 'güncellendi' : 'yeni kayıt');
                console.log('📊 DB:', db.databaseName, 'Collection:', 'userSessions');
                
                // Aktif kullanıcı sayısını stats collection'ına kaydet
                try {
                // Son 5 saniye içinde heartbeat alınan kullanıcıları online say
                // 5 saniye içinde response gelmezse kullanıcı online'dan çıkarılır
                const fiveSecondsAgo = new Date(now.getTime() - 5 * 1000);
                
                // Önce tüm userSessions kayıtlarını kontrol et
                const allUsers = await db.collection('userSessions').find({}).toArray();
                console.log('👥 Toplam userSessions kayıt sayısı:', allUsers.length);
                if (allUsers.length > 0) {
                    console.log('📝 Son kayıt:', {
                        ip: allUsers[0].ip,
                        lastSeen: allUsers[0].lastSeen,
                        lastResponseAt: allUsers[0].lastResponseAt,
                        now: now,
                        fiveSecondsAgo: fiveSecondsAgo
                    });
                }
                
                // Aktif kullanıcıları say - IP bazında unique (1 IP = 1 kullanıcı)
                // Son 5 saniye içinde lastResponseAt veya lastSeen güncellenen kullanıcılar
                // Distinct IP adresi sayısını alıyoruz
                const activeUsersQuery = await db.collection('userSessions').find({
                    $or: [
                        { lastResponseAt: { $gte: fiveSecondsAgo } },
                        { lastSeen: { $gte: fiveSecondsAgo } }
                    ]
                }).toArray();
                
                // Unique IP adreslerini say
                const uniqueIPs = new Set(activeUsersQuery.map(u => u.ip));
                const activeUsers = uniqueIPs.size;
                
                console.log('✅ Aktif kullanıcı sayısı (5 saniye içinde):', activeUsers);
                
                // 5 saniyeden eski kayıtları temizle (kullanıcı artık online değil)
                const sixSecondsAgo = new Date(now.getTime() - 6 * 1000);
                const deleteResult = await db.collection('userSessions').deleteMany({
                    $and: [
                        { lastResponseAt: { $lt: sixSecondsAgo } },
                        { lastSeen: { $lt: sixSecondsAgo } }
                    ]
                });
                
                if (deleteResult.deletedCount > 0) {
                    console.log('🗑️ Offline kullanıcılar temizlendi (5+ saniye heartbeat yok):', deleteResult.deletedCount);
                }

                // Stats collection'ını güncelle
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
                    // Stats hatası önemli değil, sadece log
                    console.error('❌ Stats güncellenemedi:', statsError);
                }
            } else {
                // Admin panelinden gelen heartbeat'ler kaydedilmiyor, sadece log
                console.log('⚠️ Admin paneli heartbeat - Kayıt edilmedi (sadece index.html sayılıyor)');
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


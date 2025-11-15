// Online kullanıcı sayısını MongoDB'den alır (heartbeat mekanizması)
// Son 10 saniye içinde aktivitesi olan kullanıcıları online sayar
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Kullanıcı heartbeat gönderiyor (online kalıyor)
        try {
            const { userId, userAgent, browserInfo } = req.body;
            const { db } = await connectToDatabase();
            
            // IP adresini request'ten al (Vercel proxy'leri için)
            const forwarded = req.headers['x-forwarded-for'];
            const realIp = req.headers['x-real-ip'];
            const cfConnectingIp = req.headers['cf-connecting-ip'];
            const ip = cfConnectingIp || (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || req.socket?.remoteAddress || 'unknown';
            
            // Browser bilgilerini al
            const browserAgent = userAgent || req.headers['user-agent'] || 'unknown';
            
            // Unique user identifier - IP + Browser fingerprint
            const userFingerprint = userId || `${ip}-${browserAgent.substring(0, 50)}`;
            
            const now = new Date();
            
            // Kullanıcı aktivitesini kaydet/güncelle
            // Response gönderildiğinde kullanıcı online sayılır
            const result = await db.collection('userSessions').updateOne(
                { userFingerprint: userFingerprint },
                {
                    $set: {
                        userId: userId || userFingerprint,
                        userFingerprint: userFingerprint,
                        lastSeen: now,
                        userAgent: browserAgent,
                        browserInfo: browserInfo || {},
                        ip: ip,
                        isOnline: true,
                        lastResponseAt: now
                    },
                    $setOnInsert: {
                        createdAt: now,
                        requestCount: 0
                    },
                    $inc: { requestCount: 1 }
                },
                { upsert: true }
            );
            
            // Response gönder - response gelirse kullanıcı online
            return res.status(200).json({ 
                success: true, 
                timestamp: now,
                userFingerprint: userFingerprint,
                message: 'Heartbeat alındı, kullanıcı online'
            });
        } catch (error) {
            console.error('Heartbeat error:', error);
            return res.status(500).json({ error: 'Sunucu hatası' });
        }
    }

    if (req.method === 'GET') {
        try {
            const { db } = await connectToDatabase();
            
            const now = new Date();
            // Son 10 saniye içinde heartbeat response'u alınan kullanıcıları online say
            // (Her 5 saniyede bir request atıldığı için 10 saniye yeterli)
            const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
            
            console.log('👥 Online kullanıcılar kontrol ediliyor - Son 10 saniye:', tenSecondsAgo);
            
            // Son 10 saniye içinde response alınan kullanıcıları say
            const onlineUsers = await db.collection('userSessions')
                .countDocuments({
                    $or: [
                        { lastResponseAt: { $gte: tenSecondsAgo } },
                        { lastSeen: { $gte: tenSecondsAgo } }
                    ]
                });
            
            console.log('✅ Online kullanıcı sayısı:', onlineUsers);
            
            // Online kullanıcı detaylarını al (opsiyonel - debug için)
            const onlineUsersDetails = await db.collection('userSessions')
                .find({
                    $or: [
                        { lastResponseAt: { $gte: tenSecondsAgo } },
                        { lastSeen: { $gte: tenSecondsAgo } }
                    ]
                })
                .sort({ lastSeen: -1 })
                .limit(100)
                .toArray();
            
            // Eski kayıtları temizle (30 saniyeden eski)
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            await db.collection('userSessions').deleteMany({
                lastSeen: { $lt: thirtySecondsAgo },
                lastResponseAt: { $lt: thirtySecondsAgo }
            });
            
            return res.status(200).json({ 
                count: onlineUsers,
                users: onlineUsersDetails.map(u => ({
                    ip: u.ip,
                    userAgent: u.userAgent,
                    lastSeen: u.lastSeen,
                    requestCount: u.requestCount || 0
                }))
            });
        } catch (error) {
            console.error('Online users error:', error);
            return res.status(500).json({ error: 'Sunucu hatası', count: 0 });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};

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
        
        console.log('💓 Heartbeat alındı - IP:', ip, 'UserAgent:', userAgent.substring(0, 30));
        
        // MongoDB bağlantısını dene
        let db;
        try {
            const dbResult = await connectToDatabase();
            db = dbResult.db;
            
            // Kullanıcı aktivitesini kaydet/güncelle (IP ile)
            const result = await db.collection('userSessions').updateOne(
                { userFingerprint: userFingerprint },
                {
                    $set: {
                        userId: userFingerprint,
                        userFingerprint: userFingerprint,
                        lastSeen: now,
                        userAgent: userAgent,
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
            
            console.log('✅ Heartbeat kaydedildi - MongoDB:', result.modifiedCount > 0 ? 'güncellendi' : 'yeni kayıt');
            
        } catch (dbError) {
            console.error('❌ MongoDB hatası:', dbError);
            // MongoDB hatası olsa bile response döndür - kullanıcı online sayılır
            // (IP ile takip edebiliriz)
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


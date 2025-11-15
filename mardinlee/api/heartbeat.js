// Heartbeat endpoint - GET isteği ile IP adresi ile online kontrol
// Network'ten görünür - Response gelirse kullanıcı online sayılır
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { db } = await connectToDatabase();
        
        // IP adresini request'ten al (Vercel proxy'leri için)
        const forwarded = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];
        const ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown');
        
        // Browser bilgilerini al
        const userAgent = req.query.userAgent || req.headers['user-agent'] || 'unknown';
        
        // Unique user identifier - IP + Browser
        const userFingerprint = `${ip}-${userAgent.substring(0, 50)}`;
        
        const now = new Date();
        
        // Kullanıcı aktivitesini kaydet/güncelle (IP ile)
        await db.collection('userSessions').updateOne(
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
        
        // Response gönder - OK dönerse kullanıcı online
        return res.status(200).json({ 
            success: true, 
            status: 'ok',
            timestamp: now,
            ip: ip,
            userFingerprint: userFingerprint,
            message: 'Heartbeat OK - User online'
        });
    } catch (error) {
        console.error('Heartbeat GET error:', error);
        return res.status(500).json({ error: 'Sunucu hatası', status: 'error' });
    }
};

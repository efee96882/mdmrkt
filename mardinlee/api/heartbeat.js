// Kullanıcı heartbeat endpoint'i - kullanıcının online olduğunu bildirir
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.body;
        const { db } = await connectToDatabase();
        
        const now = new Date();
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // Kullanıcı aktivitesini kaydet/güncelle
        await db.collection('userSessions').updateOne(
            { userId: userId || ip },
            {
                $set: {
                    userId: userId || ip,
                    lastSeen: now,
                    userAgent: userAgent,
                    ip: ip,
                    isOnline: true
                }
            },
            { upsert: true }
        );
        
        return res.status(200).json({ success: true, timestamp: now });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return res.status(500).json({ error: 'Sunucu hatası' });
    }
};


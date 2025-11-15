// Online kullanıcı sayısını MongoDB'den alır (heartbeat mekanizması)
// Son 5 dakika içinde aktivitesi olan kullanıcıları online sayar
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Kullanıcı heartbeat gönderiyor (online kalıyor)
        try {
            const { userId, userAgent, ip } = req.body;
            const { db } = await connectToDatabase();
            
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            // Kullanıcı aktivitesini kaydet/güncelle
            await db.collection('userSessions').updateOne(
                { userId: userId || ip || 'anonymous' },
                {
                    $set: {
                        userId: userId || ip || 'anonymous',
                        lastSeen: now,
                        userAgent: userAgent || req.headers['user-agent'],
                        ip: ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                        isOnline: true
                    }
                },
                { upsert: true }
            );
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Heartbeat error:', error);
            return res.status(500).json({ error: 'Sunucu hatası' });
        }
    }

    if (req.method === 'GET') {
        try {
            const { db } = await connectToDatabase();
            
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            // Son 5 dakika içinde aktivitesi olan kullanıcıları say
            const onlineUsers = await db.collection('userSessions')
                .countDocuments({
                    lastSeen: { $gte: fiveMinutesAgo }
                });
            
            // Eski kayıtları temizle (5 dakikadan eski)
            await db.collection('userSessions').deleteMany({
                lastSeen: { $lt: fiveMinutesAgo }
            });
            
            return res.status(200).json({ count: onlineUsers });
        } catch (error) {
            console.error('Online users error:', error);
            return res.status(500).json({ error: 'Sunucu hatası', count: 0 });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};


const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { db } = await connectToDatabase();
        const now = new Date();
        
        // Toplam sepet sayısı
        const totalCarts = await db.collection('carts').countDocuments();
        
        // Aktif kullanıcı sayısı - Son 5 saniye içinde heartbeat gönderenler - IP bazında unique (1 IP = 1 kullanıcı)
        // 5 saniye içinde response gelmezse kullanıcı online'dan çıkarılır
        const fiveSecondsAgo = new Date(now.getTime() - 5 * 1000);
        const onlineUsersQuery = await db.collection('userSessions').find({
            $or: [
                { lastResponseAt: { $gte: fiveSecondsAgo } },
                { 
                    $and: [
                        { lastResponseAt: { $exists: false } },
                        { lastSeen: { $gte: fiveSecondsAgo } }
                    ]
                }
            ]
        }).toArray();
        
        // Unique IP adreslerini say
        const uniqueIPs = new Set(onlineUsersQuery.map(u => u.ip));
        const onlineUsers = uniqueIPs.size;

        // Stats collection'ını güncelle
        try {
            await db.collection('stats').updateOne(
                { _id: 'current' },
                {
                    $set: {
                        activeUsers: onlineUsers,
                        totalCarts: totalCarts,
                        lastUpdated: now
                    },
                    $setOnInsert: {
                        totalPurchases: 0,
                        createdAt: now
                    }
                },
                { upsert: true }
            );
        } catch (statsError) {
            console.warn('Stats güncellenemedi:', statsError);
        }

        return res.status(200).json({
            totalCarts,
            onlineUsers,
            activeUsers: onlineUsers, // Aynı değer, farklı isimle de döndür
            timestamp: now.toISOString()
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        return res.status(500).json({ 
            error: 'Veritabanı hatası',
            message: error.message 
        });
    }
};


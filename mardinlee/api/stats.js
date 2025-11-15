const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { db } = await connectToDatabase();
        
        // Toplam sepet sayısı
        const totalCarts = await db.collection('carts').countDocuments();
        
        // Online kullanıcı sayısı - Son 5 dakika içinde aktivitesi olan
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const onlineUsers = await db.collection('userSessions')
            .countDocuments({
                lastSeen: { $gte: fiveMinutesAgo }
            });

        return res.status(200).json({
            totalCarts,
            onlineUsers
        });
    } catch (error) {
        console.error('MongoDB error:', error);
        return res.status(500).json({ error: 'Veritabanı hatası' });
    }
};


const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { db } = await connectToDatabase();
        
        // Toplam sepet sayısı
        const totalCarts = await db.collection('carts').countDocuments();
        
        // Online kullanıcı sayısı (socket.io'dan alınacak, şimdilik 0)
        const onlineUsers = 0;

        return res.status(200).json({
            totalCarts,
            onlineUsers
        });
    } catch (error) {
        console.error('MongoDB error:', error);
        return res.status(500).json({ error: 'Veritabanı hatası' });
    }
};


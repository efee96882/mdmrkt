const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { db } = await connectToDatabase();
        const purchases = await db.collection('purchases')
            .find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        return res.status(200).json(purchases);
    } catch (error) {
        console.error('MongoDB error:', error);
        return res.status(500).json({ error: 'Veritabanı hatası' });
    }
};


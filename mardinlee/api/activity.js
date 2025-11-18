// Activity log endpoint - Socket.io alternatifi olarak polling için
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    try {
        const { db } = await connectToDatabase();

        if (req.method === 'POST') {
            const body = req.body || {};
            const activity = {
                type: body.type || 'unknown',
                payload: body.payload || {},
                ip:
                    req.headers['x-forwarded-for'] ||
                    req.headers['x-real-ip'] ||
                    req.connection?.remoteAddress ||
                    'unknown',
                userAgent: req.headers['user-agent'] || '',
                createdAt: new Date()
            };

            await db.collection('activities').insertOne(activity);
            return res.status(200).json({ success: true });
        }

        if (req.method === 'GET') {
            const activities = await db
                .collection('activities')
                .find({})
                .sort({ createdAt: -1 })
                .limit(50)
                .toArray();

            return res.status(200).json(activities);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('MongoDB error:', error);
        return res.status(500).json({ error: 'Veritabanı hatası' });
    }
};


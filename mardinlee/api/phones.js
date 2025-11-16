// Phones API - iPhone modelleri (her model tek kayıt, storage seçenekleri içinde)
const { connectToDatabase } = require('./lib/mongodb');

// Varsayılan iPhone modelleri (her model için storage seçenekleri)
const DEFAULT_PHONE_MODELS = [
  // 17 serisi
  {
    family: 'iPhone 17 Pro Max',
    baseName: 'APPLE iPhone 17 Pro Max 5G',
    imageUrl: 'https://www.actimag.biz/6521-large_default/iphone-17-pro.jpg',
    storageOptions: [
      { storage: '256 GB', realPrice: 1599, discountedPrice: 1499 },
      { storage: '512 GB', realPrice: 1799, discountedPrice: 1699 },
      { storage: '1 TB', realPrice: 1999, discountedPrice: 1899 },
      { storage: '2 TB', realPrice: 2299, discountedPrice: 2199 }
    ],
    rating: 4.9,
    reviews: 120,
    description: 'Maximale Performance mit A19 Pro Chip, ProMotion Display und der besten Kamera, die es je in einem iPhone gab – ideal für Power‑User und Content‑Creator.'
  },
  {
    family: 'iPhone 17 Pro',
    baseName: 'APPLE iPhone 17 Pro 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1499, discountedPrice: 1399 },
      { storage: '512 GB', realPrice: 1699, discountedPrice: 1599 },
      { storage: '1 TB', realPrice: 1899, discountedPrice: 1799 },
      { storage: '2 TB', realPrice: 2199, discountedPrice: 2099 }
    ],
    rating: 4.8,
    reviews: 110,
    description: 'Pro‑Leistung im kompakten Format – A19 Pro Chip, ProMotion Display und eine starke Triple‑Kamera für Fotos und Videos auf Studio‑Niveau.'
  },
  {
    family: 'iPhone 17 Air',
    baseName: 'APPLE iPhone 17 Air 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1299, discountedPrice: 1199 },
      { storage: '512 GB', realPrice: 1499, discountedPrice: 1399 },
      { storage: '1 TB', realPrice: 1699, discountedPrice: 1599 },
      { storage: '2 TB', realPrice: 1899, discountedPrice: 1799 }
    ],
    rating: 4.7,
    reviews: 90,
    description: 'Ultraleichtes Design mit starker Performance – ideal für alle, die ein schlankes iPhone mit moderner Technik bevorzugen.'
  },
  {
    family: 'iPhone 17',
    baseName: 'APPLE iPhone 17 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1199, discountedPrice: 1099 },
      { storage: '512 GB', realPrice: 1399, discountedPrice: 1299 },
      { storage: '1 TB', realPrice: 1599, discountedPrice: 1499 },
      { storage: '2 TB', realPrice: 1799, discountedPrice: 1699 }
    ],
    rating: 4.6,
    reviews: 80,
    description: 'Der ideale Einstieg in die 17er‑Generation – starke Kamera, flüssiges Display und zuverlässige Performance für den Alltag.'
  },
  // 16 serisi
  {
    family: 'iPhone 16 Pro Max',
    baseName: 'APPLE iPhone 16 Pro Max 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1499, discountedPrice: 1399 },
      { storage: '512 GB', realPrice: 1699, discountedPrice: 1599 },
      { storage: '1 TB', realPrice: 1899, discountedPrice: 1799 },
      { storage: '2 TB', realPrice: 2099, discountedPrice: 1999 }
    ],
    rating: 4.8,
    reviews: 150,
    description: 'Pro‑Leistung mit großem Display, ideal für Filme, Games und Produktivität unterwegs.'
  },
  {
    family: 'iPhone 16 Pro',
    baseName: 'APPLE iPhone 16 Pro 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1399, discountedPrice: 1299 },
      { storage: '512 GB', realPrice: 1599, discountedPrice: 1499 },
      { storage: '1 TB', realPrice: 1799, discountedPrice: 1699 },
      { storage: '2 TB', realPrice: 1999, discountedPrice: 1899 }
    ],
    rating: 4.8,
    reviews: 140,
    description: 'Kompaktes Pro‑Modell mit starker Kamera und Top‑Performance für Arbeit und Freizeit.'
  },
  {
    family: 'iPhone 16',
    baseName: 'APPLE iPhone 16 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1199, discountedPrice: 1099 },
      { storage: '512 GB', realPrice: 1399, discountedPrice: 1299 },
      { storage: '1 TB', realPrice: 1599, discountedPrice: 1499 },
      { storage: '2 TB', realPrice: 1799, discountedPrice: 1699 }
    ],
    rating: 4.5,
    reviews: 100,
    description: 'Der ausgewogene Allrounder – moderne Kamera, flüssiges System und genug Speicher für den Alltag.'
  },
  // 15 serisi
  {
    family: 'iPhone 15 Pro Max',
    baseName: 'APPLE iPhone 15 Pro Max 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1399, discountedPrice: 1299 },
      { storage: '512 GB', realPrice: 1599, discountedPrice: 1499 },
      { storage: '1 TB', realPrice: 1799, discountedPrice: 1699 },
      { storage: '2 TB', realPrice: 1999, discountedPrice: 1899 }
    ],
    rating: 4.7,
    reviews: 200,
    description: 'Titan‑Design, lange Akkulaufzeit und starke Kamera – ideal für anspruchsvolle Nutzer.'
  },
  {
    family: 'iPhone 15 Pro',
    baseName: 'APPLE iPhone 15 Pro 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 1299, discountedPrice: 1199 },
      { storage: '512 GB', realPrice: 1499, discountedPrice: 1399 },
      { storage: '1 TB', realPrice: 1699, discountedPrice: 1599 },
      { storage: '2 TB', realPrice: 1899, discountedPrice: 1799 }
    ],
    rating: 4.7,
    reviews: 180,
    description: 'Leistungsstarkes Pro‑Modell im handlichen Format – ideal für den täglichen Einsatz.'
  },
  {
    family: 'iPhone 15',
    baseName: 'APPLE iPhone 15 5G',
    imageUrl: 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png',
    storageOptions: [
      { storage: '256 GB', realPrice: 999, discountedPrice: 949 },
      { storage: '512 GB', realPrice: 1199, discountedPrice: 1149 },
      { storage: '1 TB', realPrice: 1399, discountedPrice: 1349 },
      { storage: '2 TB', realPrice: 1599, discountedPrice: 1549 }
    ],
    rating: 4.6,
    reviews: 220,
    description: 'Starker Einstieg in die 15er‑Generation – ideale Mischung aus Preis, Leistung und Kamera.'
  }
];

function toDoc(model) {
  // En düşük fiyatlı storage seçeneğini varsayılan olarak kullan (index için)
  const defaultStorage = model.storageOptions[0];
  const realPrice = defaultStorage.realPrice;
  const discountedPrice = defaultStorage.discountedPrice;
  const discountPercent = realPrice > 0 ? ((realPrice - discountedPrice) / realPrice) * 100 : 0;

  // Storage seçeneklerini hesapla
  const storageOptions = model.storageOptions.map(opt => ({
    storage: opt.storage,
    realPrice: opt.realPrice,
    discountedPrice: opt.discountedPrice,
    discountPercent: opt.realPrice > 0 ? ((opt.realPrice - opt.discountedPrice) / opt.realPrice) * 100 : 0
  }));

  // URL-friendly slug oluştur
  const slug = model.family.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return {
    name: model.baseName, // Storage olmadan sadece model adı
    family: model.family,
    baseName: model.baseName,
    slug: slug,
    storageOptions: storageOptions,
    realPrice, // En düşük fiyat (gösterim için)
    discountedPrice, // En düşük indirimli fiyat
    discountPercent,
    imageUrl: model.imageUrl || 'https://assets.mmsrg.com/isr/166325/c1/-/ASSET_MMS_161554000/fee_786_587_png', // Her telefona özel resim linki veya placeholder
    rating: model.rating,
    reviews: model.reviews,
    description: model.description,
    datasheetEnabled: true,
    energyClass: 'A',
    category: 'phone',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const phonesCol = db.collection('phones');

    // Slug parametresi varsa tek bir telefon döndür
    const slug = req.query.slug;
    if (slug) {
      const phone = await phonesCol.findOne({ slug: slug, isActive: { $ne: false } });
      if (!phone) {
        return res.status(404).json({ error: 'Telefon bulunamadı' });
      }
      return res.status(200).json(phone);
    }

    // Eğer boşsa varsayılanları seed et
    const count = await phonesCol.countDocuments();
    if (count === 0) {
      const docs = DEFAULT_PHONE_MODELS.map(toDoc);
      await phonesCol.insertMany(docs);
      console.log('📱 Default iPhone modelleri phones koleksiyonuna eklendi:', docs.length);
    } else {
      // Mevcut kayıtları phones.js'deki imageUrl'lerle güncelle
      for (const model of DEFAULT_PHONE_MODELS) {
        if (model.imageUrl) {
          const result = await phonesCol.updateMany(
            { family: model.family },
            { 
              $set: { 
                imageUrl: model.imageUrl,
                updatedAt: new Date()
              } 
            }
          );
          if (result.modifiedCount > 0) {
            console.log('🔄 Güncellendi:', model.family, '- Yeni resim URL:', model.imageUrl);
          }
        }
      }
    }

    // Tüm telefonları listele (her model tek kayıt)
    const phones = await phonesCol
      .find({ isActive: { $ne: false } })
      .sort({ family: 1 })
      .toArray();

    return res.status(200).json(phones);
  } catch (error) {
    console.error('❌ Phones API error:', error);
    return res.status(500).json({
      error: 'Veritabanı hatası',
      message: error.message
    });
  }
};



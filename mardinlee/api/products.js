// Products API - Ürün listesi ve ekleme
const { connectToDatabase } = require('./lib/mongodb');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const { db } = await connectToDatabase();

            const products = await db.collection('products')
                .find({ isActive: { $ne: false } })
                .sort({ createdAt: -1 })
                .limit(100)
                .toArray();

            return res.status(200).json(products);
        } catch (error) {
            console.error('❌ Products GET error:', error);
            return res.status(500).json({
                error: 'Veritabanı hatası',
                message: error.message
            });
        }
    }

    if (req.method === 'POST') {
        try {
            const { db } = await connectToDatabase();

            const {
                name,
                realPrice,
                discountedPrice,
                discountPercent,
                imageUrl,
                rating,
                reviews
            } = req.body || {};

            if (!name || realPrice == null || discountedPrice == null) {
                return res.status(400).json({
                    error: 'Eksik alanlar',
                    message: 'Ürün adı, gerçek fiyat ve indirimli fiyat zorunludur'
                });
            }

            let numericRealPrice = parseFloat(realPrice);
            let numericDiscountedPrice = parseFloat(discountedPrice);
            let numericDiscountPercent = discountPercent != null ? parseFloat(discountPercent) : null;

            if (Number.isNaN(numericRealPrice) || Number.isNaN(numericDiscountedPrice)) {
                return res.status(400).json({
                    error: 'Geçersiz fiyat',
                    message: 'Fiyatlar sayısal olmalıdır'
                });
            }

            if (numericDiscountPercent == null || Number.isNaN(numericDiscountPercent)) {
                if (numericRealPrice > 0) {
                    numericDiscountPercent = ((numericRealPrice - numericDiscountedPrice) / numericRealPrice) * 100;
                } else {
                    numericDiscountPercent = 0;
                }
            }

            const now = new Date();
            const productDoc = {
                name: String(name),
                realPrice: numericRealPrice,
                discountedPrice: numericDiscountedPrice,
                discountPercent: numericDiscountPercent,
                imageUrl: imageUrl ? String(imageUrl) : '',
                rating: rating != null && !Number.isNaN(parseFloat(rating)) ? parseFloat(rating) : null,
                reviews: reviews != null && !Number.isNaN(parseInt(reviews, 10)) ? parseInt(reviews, 10) : 0,
                category: '-',
                isActive: true,
                createdAt: now,
                updatedAt: now
            };

            const result = await db.collection('products').insertOne(productDoc);

            console.log('✅ Ürün kaydedildi MongoDB:', {
                _id: result.insertedId,
                name: productDoc.name,
                realPrice: productDoc.realPrice,
                discountedPrice: productDoc.discountedPrice,
                discountPercent: productDoc.discountPercent
            });

            return res.status(201).json({
                success: true,
                product: {
                    _id: result.insertedId,
                    ...productDoc
                }
            });
        } catch (error) {
            console.error('❌ Products POST error:', error);
            return res.status(500).json({
                error: 'Veritabanı hatası',
                message: error.message
            });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { db } = await connectToDatabase();
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ error: 'Eksik id' });
            }

            const {
                name,
                realPrice,
                discountedPrice,
                discountPercent,
                imageUrl,
                rating,
                reviews,
                datasheetEnabled,
                energyClass,
                isActive
            } = req.body || {};

            const update = {
                $set: {
                    updatedAt: new Date()
                }
            };

            if (name != null) update.$set.name = String(name);
            if (realPrice != null && !Number.isNaN(parseFloat(realPrice))) update.$set.realPrice = parseFloat(realPrice);
            if (discountedPrice != null && !Number.isNaN(parseFloat(discountedPrice))) update.$set.discountedPrice = parseFloat(discountedPrice);
            if (discountPercent != null && !Number.isNaN(parseFloat(discountPercent))) update.$set.discountPercent = parseFloat(discountPercent);
            if (imageUrl != null) update.$set.imageUrl = String(imageUrl);
            if (rating != null && !Number.isNaN(parseFloat(rating))) update.$set.rating = parseFloat(rating);
            if (reviews != null && !Number.isNaN(parseInt(reviews, 10))) update.$set.reviews = parseInt(reviews, 10);
            if (datasheetEnabled != null) update.$set.datasheetEnabled = !!datasheetEnabled;
            if (energyClass != null) update.$set.energyClass = String(energyClass || 'A');
            if (isActive != null) update.$set.isActive = !!isActive;

            const result = await db.collection('products').updateOne(
                { _id: require('mongodb').ObjectId.createFromHexString(id) },
                update
            );

            return res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
        } catch (error) {
            console.error('❌ Products PUT error:', error);
            return res.status(500).json({ error: 'Veritabanı hatası', message: error.message });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { db } = await connectToDatabase();
            const id = req.query.id;
            if (!id) {
                return res.status(400).json({ error: 'Eksik id' });
            }
            const result = await db.collection('products').deleteOne({
                _id: require('mongodb').ObjectId.createFromHexString(id)
            });
            return res.status(200).json({ success: true, deletedCount: result.deletedCount });
        } catch (error) {
            console.error('❌ Products DELETE error:', error);
            return res.status(500).json({ error: 'Veritabanı hatası', message: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};



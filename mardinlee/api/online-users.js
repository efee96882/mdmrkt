// Bu endpoint socket.io server'dan online kullanıcı sayısını alır
// Şimdilik basit bir implementasyon

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Socket.io server'dan online kullanıcı sayısını al
        // Şimdilik mock data döndürüyoruz
        // Gerçek implementasyonda socket.io server ile iletişim kurulmalı
        
        const count = 0; // Socket.io'dan alınacak
        
        return res.status(200).json({ count });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Sunucu hatası' });
    }
};


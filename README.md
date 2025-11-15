# MediaMarkt Admin Panel

Vercel uyumlu MongoDB bağlantılı admin paneli.

## Özellikler

- ✅ Sidebar navigasyon
- ✅ Loglar bölümü (en üstte)
- ✅ Toplam Sepet sayısı
- ✅ Anlık çevrimiçi kullanıcı sayısı
- ✅ Socket.io ile kullanıcı aktivite takibi
- ✅ Satın alanlar listesi (Ad, Soyad, IBAN)

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Environment değişkenlerini ayarlayın (Vercel'de):
- `MONGODB_URI`: MongoDB bağlantı string'i
- `MONGODB_DB`: Veritabanı adı (opsiyonel, varsayılan: mediamarkt)

3. Vercel'e deploy edin:
```bash
vercel deploy
```

## Socket.io Server

Socket.io server'ı ayrı bir process olarak çalıştırmanız gerekiyor:

```bash
node server.js
```

Veya ayrı bir Vercel deployment olarak deploy edebilirsiniz.

## MongoDB Collections

Admin paneli şu collection'ları kullanır:

- `purchases`: Satın alma kayıtları
  - `firstName`: Ad
  - `lastName`: Soyad
  - `iban`: IBAN
  - `createdAt`: Oluşturulma tarihi

- `carts`: Sepet kayıtları
  - Toplam sepet sayısını hesaplamak için kullanılır

## API Endpoints

- `GET /api/purchases`: Satın alanlar listesi
- `GET /api/stats`: İstatistikler (toplam sepet, çevrimiçi kullanıcı)
- `GET /api/online-users`: Çevrimiçi kullanıcı sayısı

## Notlar

- Socket.io Vercel serverless functions ile tam uyumlu değildir. Ayrı bir server gerekebilir.
- Alternatif olarak polling mekanizması kullanılabilir.


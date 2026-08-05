# Deployment

Ücretsiz katmanlarla canlıya alma rehberi. Üç servis kullanılıyor:

| Parça | Servis | Not |
|---|---|---|
| PostgreSQL | Neon | 0.5 GB, kalıcı |
| Backend (.NET 10 API) | Render | Docker, free web service |
| Frontend (statik) | Vercel | Build gerektirmiyor |

## 1. Veritabanı (Neon)

1. [neon.tech](https://neon.tech) üzerinde proje oluştur (region: Europe/Frankfurt).
2. Connection string'i **.NET** formatında kopyala:

   ```
   Host=ep-xxx.eu-central-1.aws.neon.tech;Database=neondb;Username=...;Password=...;SSL Mode=Require;Channel Binding=Require
   ```

## 2. Backend (Render)

1. [render.com](https://render.com) → New → Web Service → repo bağla.
2. Ayarlar:
   - Root Directory: `backend`
   - Runtime: `Docker`
   - Instance Type: `Free`
3. Environment variables:

   | Key | Değer |
   |---|---|
   | `ConnectionStrings__DefaultConnection` | Neon connection string |
   | `Jwt__Key` | 40+ karakterlik rastgele secret |
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `Cors__AllowedOrigins__0` | Vercel adresi (adım 3'ten sonra) |

4. Deploy sonrası `https://<servis-adi>.onrender.com` adresi oluşur.

Migration'lar uygulama açılışında otomatik uygulanıyor (`Program.cs` içindeki
`MigrateAsync` çağrısı), ayrıca bir adım gerekmiyor.

## 3. Frontend (Vercel)

1. [vercel.com](https://vercel.com) → Add New → Project → repo seç.
2. Ayarlar:
   - Framework Preset: `Other`
   - Root Directory: `frontend`
   - Build Command / Output Directory: boş
3. Deploy sonrası `js/config.js` içindeki production URL'ini Render adresiyle
   güncelle ve push et.
4. Render'daki `Cors__AllowedOrigins__0` değerini Vercel adresiyle doldur.

## Bilinen kısıtlar

- **Cold start:** Render free servis 15 dakika trafiksiz kalınca uykuya geçer;
  sonraki ilk istek ~50 saniye sürebilir.
- **Dosya ekleri:** `Storage:UploadsFolder` container diskine yazıyor ve bu disk
  kalıcı değil. Her deploy sonrası yüklenmiş ekler kaybolur; kalıcı depolama
  gerekiyorsa harici bir object storage'a geçilmeli.

## Lokal doğrulama

```bash
cd backend
docker build -t itsm-api .
```

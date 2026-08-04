# Pulse ITSM

Kurum içi BT destek talep yönetimi (ITSM) uygulaması. Talep açma ve takip,
proje bazlı yetkilendirme, SLA izleme, bilgi bankası ve denetim kaydı.

Turkcell staj projesi olarak geliştirildi.

## Neler var

- **Talep yönetimi** — oluşturma, atama, durum takibi, yorum ve dosya eki
- **Proje bazlı yetkilendirme** — yetkiler kullanıcıya ya global ya da tek
  bir proje için verilebiliyor
- **SLA izleme** — yanıt/çözüm süresi aşımında otomatik bildirim
- **Otomatik atama** — kategori ve gruba göre kural tanımlama
- **Bilgi bankası** — makale yazma, arama, görüntülenme sayacı
- **Yönetim paneli** — kullanıcı, grup, proje, SLA, yetki ve aktivite kaydı
- **Panel** — durum/öncelik dağılımı, SLA uyumu, son talepler
- **İki dil (TR/EN)**, açık/koyu tema, mobil uyumlu arayüz

## Teknolojiler

| Katman | Kullanılan |
|---|---|
| Backend | .NET 10, ASP.NET Core Web API, Entity Framework Core |
| Veritabanı | PostgreSQL |
| Frontend | Vanilla JS (ES modules), hash tabanlı router, framework yok |
| Kimlik doğrulama | JWT |
| E-posta | MailKit (SMTP) |
| Test | xUnit, Moq |
| CI | Bitbucket Pipelines + SonarCloud |

Backend Clean Architecture ile katmanlı: `Domain` ← `Application` ←
`Infrastructure` ← `API`. Bağımlılıklar hep içeri doğru.

## Dizin yapısı

```
backend/
  src/
    ITSM.Domain/          Varlıklar, sabitler — hiçbir şeye bağımlı değil
    ITSM.Application/     İş kuralları, servisler, DTO'lar, arayüzler
    ITSM.Infrastructure/  EF Core, repository'ler, e-posta, yerelleştirme
    ITSM.API/             Controller'lar, kimlik doğrulama, DI kurulumu
  tests/                  Birim ve entegrasyon testleri
database/
  scripts/schema/         DDL ve rol tanımları
  scripts/seed/           Referans veri + demo verisi
frontend/                 index.html + js/ + css/ (derleme adımı yok)
docs/                     Gereksinimler, tasarım dili, demo kullanıcıları
```

## Kurulum

**Gerekenler:** .NET 10 SDK, PostgreSQL 15+

**1. Veritabanı**

```bash
createdb itsm
psql -d itsm -f database/scripts/schema/001_ddl_schema.sql
psql -d itsm -f database/scripts/schema/002_roles_and_grants.sql
psql -d itsm -f database/scripts/seed/001_seed_reference_data.sql
psql -d itsm -f database/scripts/seed/002_demo_data.sql   # demo verisi, isteğe bağlı
```

**2. Gizli ayarlar**

Bağlantı dizesi ve anahtarlar repoda tutulmuyor, User Secrets ile veriliyor:

```bash
cd backend/src/ITSM.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=itsm;Username=postgres;Password=..."
dotnet user-secrets set "Jwt:Key" "en-az-32-karakterlik-rastgele-bir-anahtar"
dotnet user-secrets set "Email:Username" "..."   # SMTP, bildirim e-postaları için
dotnet user-secrets set "Email:Password" "..."
```

E-posta ayarlanmazsa uygulama çalışır, yalnızca bildirim e-postaları
gönderilemez.

**3. Çalıştırma**

```bash
dotnet run --project backend/src/ITSM.API      # API
```

Frontend statik dosyalardan ibaret, derleme gerektirmiyor. `frontend/`
klasörünü bir statik sunucuyla açmak yeterli (ör. VS Code Live Server,
varsayılan port 5500). İzin verilen origin'ler `appsettings.json` içindeki
`Cors:AllowedOrigins` listesinde.

## Demo hesapları

Demo verisi yüklendiyse tüm kullanıcıların şifresi `12345`, yönetici hesabı
`admin@itsm.local`. Hangi hesabın neyi gördüğü:
[docs/demo-kullanicilari.md](docs/demo-kullanicilari.md)

## Test

```bash
dotnet test backend/ITSM.slnx
```

## Dokümanlar

- [Proje gereksinimleri](docs/proje-gereksinimleri.md)
- [Frontend tasarım dili](docs/frontend-tasarim-dili.md) — yeni ekran
  eklerken uyulan kurallar
- [Geliştirme planı](docs/gelistirme-plani.md)
- [Demo kullanıcıları](docs/demo-kullanicilari.md)

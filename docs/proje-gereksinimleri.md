# Proje Gereksinimleri (Stajyer Görev Dokümanı)

Kaynak: `ITSM Tool Geliştirme Projesi - Stajyer Görev Dokümanı`, TEAM-SMS, 06.07.2026, v1.0.
Bu dosya, brief'in tamamının özetidir — asıl PDF kaybolsa/unutulsa bile buradan referans alınabilir.

## 1. Proje Tanımı

Gerçek bir ITSM (IT Service Management) uygulaması. Farklı iş birimlerinin IT talep ve sorunlarını
yönetebileceği, yetkilendirme altyapısına sahip, **çok projeli** bir sistem.

## 2. Teknoloji Stack (sabit, değiştirilemez)

| Katman | Teknoloji |
|---|---|
| Backend | .NET (C#) |
| Veritabanı | PostgreSQL |
| Frontend | HTML, CSS, JS (framework yok) |
| DB Yönetim Aracı | DBeaver |
| Versiyon Kontrol | Git & Bitbucket |
| Kod Kalite Analizi | SonarQube |

## 3. Zorunlu Uygulama Gereksinimleri

### 3.1 Admin Ekranı
Tam yetkili bir Admin paneli olmalı. Sistemin tüm yönetimi admin panelinden yapılabilmeli
(kullanıcı, grup, yetki, proje, kategori vb. yönetimi).

### 3.2 Grup & Yetkilendirme Yapısı
- Farklı iş birimlerini temsil eden **gruplar** (örn: Yazılım Geliştirme, Sistem & Network, Destek
  Birimi, Veritabanı Yönetimi).
- Her grubun içinde kullanıcılar.
- Her kullanıcının **farklı yetkileri** olabilmeli (talep oluşturma, talep onaylama, atama yapma,
  raporlama, admin işlemleri vb.).
- Yetkilendirme **esnek** olmalı: aynı gruptaki iki kişi farklı yetkilere sahip olabilmeli.
  → Bu yüzden rol-bazlı değil, **kullanıcı-bazlı** (per-user) yetki modeli seçildi
    (`user_permissions`, opsiyonel `project_id` scope'u ile).

### 3.3 Proje Yapısı
- **En az 5 farklı proje** olmalı.
- Her proje kendi talep akışına, kategorilerine ve atama kurallarına sahip olabilir.
- Projeler birbirinden **bağımsız yönetilebilmeli** (gerçek bir ITSM toolundaki gibi).

### 3.4 ITSM Özellikleri (örnektir, sınırlı değil — araştırıp kapsamı kendin belirle)
- Incident Management (Olay Yönetimi)
- Service Request Management (Hizmet Talep Yönetimi)
- Talep durumları (Açık, Devam Ediyor, Beklemede, Çözüldü, Kapatıldı vb.)
- Talep önceliklendirme (Kritik, Yüksek, Orta, Düşük)
- Talep atama ve transfer
- SLA takibi
- Dashboard / Raporlama
- Bildirim mekanizması
- Bilgi bankası (Knowledge Base)

Referans alınması istenen gerçek toollar: ServiceNow, Jira Service Management, ManageEngine.

## 4. Geliştirme Sürecine Dair Beklentiler

### 4.1 Git & Bitbucket
- Tüm kod Bitbucket'ta bir repo'da.
- **Sık ve anlamlı commit'ler** — büyük tek seferlik commit yerine küçük/sık commit.
- Her commit mesajı yapılan değişikliği açıkça ifade etmeli.
- Branch stratejisi serbest (main/develop/feature branch vb.) — uygulanan strateji ve kesin
  commit/push kuralları için bkz. `CLAUDE.md` → "Git İş Akışı ve Commit Kuralları".

### 4.2 SonarQube
- Proje kodu SonarQube ile taranacak.
- Kod kalitesi, güvenlik açıkları, code smell takibi.
- Kurulum/entegrasyon kendin yapılacak. **Henüz yapılmadı — plana eklenmeli.**

### 4.3 Veritabanı Yönetimi
- PostgreSQL, DBeaver üzerinden yönetim.
- Tablo yapıları ve ilişkiler kendin planlanacak (bkz. `database/er-diagrams/schema-plan.md`).

### 4.4 AI Kullanımı — KRİTİK KURAL
AI araçları kullanılabilir, sakıncası yok. **Ancak:** yazılan her satır kod, her tasarım kararı,
her mimari tercih anlatılabilir durumda olmalı. **"Bunu AI yazdı, bilmiyorum" kabul edilebilir bir
cevap değil.** Kodu anla, öğren, sahiplen.
→ Bu yüzden Claude ile çalışma tarzı: kavram anlatılır, kod satır satır açıklanır, kodu kullanıcı
kendi eliyle dosyaya yazar (kopyala-yapıştır değil).

## 5. Opsiyonel / Bonus Özellikler (zorunlu değil, projeyi güçlendirir)

- E-posta entegrasyonu (talep oluşturma/güncelleme bildirimi)
- Dosya ekleme (ekran görüntüsü / dosya yükleme)
- Grafiksel Dashboard (talep istatistikleri görselleştirme)
- Arama & Filtreleme (gelişmiş arama)
- Audit Log (kim, ne zaman, ne yaptı)
- Talep üzerine yorum/mesajlaşma
- Responsive tasarım (mobil uyumlu)
- Otomatik atama kuralları (kategoriye göre)
- SLA ihlal uyarıları (süre aşımında uyarı)
- Çoklu dil desteği (TR/EN)

## 6. Son Notlar / Teslim Beklentileri

- Amaç: gerçek iş hayatında kullanılan bir sistemin nasıl geliştirildiğini öğrenmek.
- Takılınca araştır, dene, öğren; çözülemeyince ekibe sorulabilir.
- **Düzenli ilerleme ve yaptıklarını anlatabilme bekleniyor** (→ staj defteri günlük tutuluyor).
- **İyi bir README hazırlanmalı**: projenin nasıl ayağa kaldırılacağı ve nasıl çalıştığı anlatılmalı.
  (Mevcut `README.md` hâlâ Bitbucket'ın varsayılan şablonu — yazılması gerekiyor, bkz. plan Gün 10.)

## 7. Brief'te Açıkça Yazmayan ama Yorumlanan Kararlar

Bazı tasarım kararları brief'te birebir yazmıyor ama "gerçek bir ITSM toolu gibi çalışmalı" ve
"projeler birbirinden bağımsız yönetilebilmeli" ifadelerinden çıkarım yapıldı:

- **Ticket görünürlüğü/gizlilik filtresi** (bir kullanıcı sadece kendi oluşturduğu / kendine
  atanan / üyesi olduğu projedeki ticket'ları görebilir, admin bypass hariç): brief'te zorunlu
  olarak yazmıyor, ama gerçek ITSM toollarının (ServiceNow, Jira SM) hepsinde bu şekilde çalışır
  ve "projeler bağımsız yönetilebilmeli" ifadesiyle tutarlı. **Önerilen, henüz onaylanmadı/
  uygulanmadı.**

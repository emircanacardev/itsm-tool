-- ITSM Tool - Demo / Sunum Verisi
-- ==========================================================
-- Bu script sunumda her özelliği canlı gösterebilmek için tasarlandı:
-- farklı yetki seviyelerinde kullanıcılar, asimetrik proje üyelikleri
-- (görünürlük filtresi), SLA'nın dört katmanı, otomatik atama kuralları,
-- beş duruma yayılmış talepler ve bilerek SLA'sı aşmış kayıtlar.
--
-- KULLANIM
--   EF migration'ları uygulandıktan SONRA çalıştırılır:
--     dotnet ef database update --project src/ITSM.Infrastructure --startup-project src/ITSM.API
--     psql -d <veritabani> -f database/scripts/seed/002_demo_data.sql
--
--   Script kendi verisini baştan kurar (aşağıdaki TRUNCATE), bu yüzden
--   tekrar tekrar çalıştırılabilir.
--
-- DİKKAT: Bu script demo/geliştirme içindir. Tüm kullanıcıların şifresi
-- aynıdır ve production'da asla çalıştırılmamalıdır.
--
-- Tablo/kolon adları EF Core'un ürettiği şemayla (PascalCase, tırnaklı)
-- eşleşir; database/scripts/schema/ altındaki DDL referans dokümandır.
-- ==========================================================

-- Bu dosya UTF-8 kodlu ve Türkçe karakter içeriyor. Windows'ta psql,
-- client encoding'i konsolun kod sayfasından (ör. WIN1254) çıkarıyor ve
-- "0x9e ... has no equivalent in encoding UTF8" hatasıyla script'i
-- ROLLBACK ediyor. Aşağıdaki satır bunu açıkça düzeltiyor.
\encoding UTF8

BEGIN;

-- ----------------------------------------------------------
-- 0. Mevcut demo verisini temizle
-- ----------------------------------------------------------
-- Statuses/Priorities ve çevirileri korunuyor: onlar migration ile
-- seed edilen referans veri, demo verisi değil.
TRUNCATE TABLE
    "AuditLogs",
    "Notifications",
    "SlaBreaches",
    "Attachments",
    "Comments",
    "TicketAssignments",
    "TicketStatusHistories",
    "Tickets",
    "AutoAssignmentRules",
    "Slas",
    "KnowledgeBaseArticles",
    "UserPermissions",
    "ProjectMembers",
    "Categories",
    "Projects",
    "Users",
    "Groups",
    "Permissions"
RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------
-- 1. Yetki kataloğu
-- ----------------------------------------------------------
-- Kodlar ITSM.Domain/Constants/Permissions.cs ile birebir eşleşmeli;
-- Program.cs her kod için bir authorization policy kaydediyor.
INSERT INTO "Permissions" ("Id", "Code", "Name", "Description") VALUES
    (1, 'TICKET_CREATE',        'Talep Oluşturma',   'Yeni talep/incident açabilir'),
    (2, 'TICKET_ASSIGN',        'Talep Atama',       'Talebi bir kullanıcıya atayabilir'),
    (3, 'TICKET_STATUS_UPDATE', 'Durum Güncelleme',  'Talebin durumunu değiştirebilir'),
    (4, 'ADMIN_MANAGE',         'Admin İşlemleri',   'Grup, kullanıcı, yetki, proje yönetimi yapabilir');

SELECT setval(pg_get_serial_sequence('"Permissions"', 'Id'), 4);

-- ----------------------------------------------------------
-- 2. Gruplar (iş birimleri)
-- ----------------------------------------------------------
INSERT INTO "Groups" ("Id", "Name", "SystemKey", "Description", "CreatedAt") VALUES
    (1, 'Yazılım Geliştirme',  NULL,         'Uygulama geliştirme ekibi',                  now()),
    (2, 'Sistem & Network',    NULL,         'Sistem yönetimi ve network operasyonları',   now()),
    (3, 'Destek Birimi',       NULL,         'Birinci seviye destek / help desk',          now()),
    (4, 'Veritabanı Yönetimi', NULL,         'DB yönetimi ve bakım ekibi',                 now()),
    -- SystemKey dolu: kayıt akışı bu grubu adına göre değil anahtarına göre bulur.
    (5, 'Atanmamış',           'UNASSIGNED', 'Kayıt olan yeni kullanıcıların varsayılan grubu', now());

SELECT setval(pg_get_serial_sequence('"Groups"', 'Id'), 5);

-- ----------------------------------------------------------
-- 3. Kullanıcılar
-- ----------------------------------------------------------
-- Tüm kullanıcıların şifresi: 12345
-- (BCrypt EnhancedHashPassword ile üretildi - PasswordHasher.cs)
--
-- Sunumda gösterilecek kullanıcı tipleri:
--   1      : süper admin (ADMIN_MANAGE)
--   2-3    : proje yöneticileri (atama + durum güncelleme)
--   4-7    : destek uzmanları (farklı gruplarda)
--   8-12   : son kullanıcılar (yalnızca talep açabilir)
--   13     : pasif kullanıcı -> giriş denemesi 401 döner
--   14     : PreferredLanguage = 'en' -> bildirim/e-posta İngilizce gelir
INSERT INTO "Users" ("Id", "GroupId", "FullName", "Email", "PasswordHash", "IsActive", "PreferredLanguage", "CreatedAt", "UpdatedAt") VALUES
    (1,  2, 'Emircan Açar',     'admin@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '120 days', now()),
    (2,  1, 'Deniz Yılmaz',     'deniz@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '110 days', now()),
    (3,  2, 'Burak Şahin',      'burak@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '105 days', now()),
    (4,  3, 'Elif Kaya',        'elif@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '100 days', now()),
    (5,  3, 'Mert Demir',       'mert@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '95 days',  now()),
    (6,  2, 'Ayşe Korkmaz',     'ayse@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '90 days',  now()),
    (7,  4, 'Can Öztürk',       'can@itsm.local',      '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '85 days',  now()),
    (8,  1, 'Zeynep Aydın',     'zeynep@itsm.local',   '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '80 days',  now()),
    (9,  1, 'Kaan Arslan',      'kaan@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '75 days',  now()),
    (10, 3, 'Selin Doğan',      'selin@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '70 days',  now()),
    (11, 4, 'Onur Çelik',       'onur@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '65 days',  now()),
    (12, 5, 'Yeni Kullanıcı',   'yeni@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '3 days',   now()),
    -- Pasif kullanıcı: doğru şifreyle bile giriş yapamaz (AuthService IsActive kontrolü).
    (13, 3, 'Pasif Personel',   'pasif@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', false, 'tr', now() - interval '60 days',  now()),
    -- İngilizce tercihli kullanıcı: bildirim ve e-postaları İngilizce alır.
    (14, 1, 'John Smith',       'john@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'en', now() - interval '55 days',  now());

SELECT setval(pg_get_serial_sequence('"Users"', 'Id'), 14);

-- ----------------------------------------------------------
-- 4. Projeler
-- ----------------------------------------------------------
INSERT INTO "Projects" ("Id", "Name", "Code", "Description", "IsActive", "CreatedAt") VALUES
    (1, 'Kurumsal Portal',    'PORTAL', 'Müşteri self-servis portali ve web uygulaması', true, now() - interval '120 days'),
    (2, 'Mobil Uygulama',     'MOBILE', 'iOS ve Android müşteri uygulaması',             true, now() - interval '100 days'),
    (3, 'BT Altyapı',         'INFRA',  'Sunucu, network ve donanım operasyonları',      true, now() - interval '115 days'),
    (4, 'Veri Ambarı',        'DWH',    'Raporlama ve veri ambarı platformu',            true, now() - interval '80 days');

SELECT setval(pg_get_serial_sequence('"Projects"', 'Id'), 4);

-- ----------------------------------------------------------
-- 5. Kategoriler
-- ----------------------------------------------------------
INSERT INTO "Categories" ("Id", "ProjectId", "Name", "Description") VALUES
    -- Kurumsal Portal
    (1,  1, 'Giriş / Kimlik Doğrulama', 'Oturum açma, şifre ve yetki sorunları'),
    (2,  1, 'Arayüz Hatası',            'Ekran, form ve görüntüleme hataları'),
    (3,  1, 'Performans',               'Yavaşlık ve zaman aşımı sorunları'),
    (4,  1, 'Yeni Özellik Talebi',      'Geliştirme istekleri'),
    -- Mobil Uygulama
    (5,  2, 'Çökme / Kararlılık',       'Uygulama kapanması ve donma'),
    (6,  2, 'Bildirim Sorunları',       'Push bildirim iletilmemesi'),
    (7,  2, 'Uyumluluk',                'Cihaz ve işletim sistemi uyumluluğu'),
    -- BT Altyapı
    (8,  3, 'Donanım Arızası',          'Bilgisayar, yazıcı ve çevre birimleri'),
    (9,  3, 'Ağ / Bağlantı',            'İnternet, VPN ve ağ erişimi'),
    (10, 3, 'Sunucu / Servis',          'Sunucu kaynak ve servis kesintileri'),
    (11, 3, 'Yazılım Kurulumu',         'Lisans ve kurulum talepleri'),
    -- Veri Ambarı
    (12, 4, 'ETL Hatası',               'Veri aktarım işlerinde hatalar'),
    (13, 4, 'Rapor Talebi',             'Yeni rapor ve analiz istekleri'),
    (14, 4, 'Veri Tutarsızlığı',        'Kaynak ile ambar arasındaki farklar');

SELECT setval(pg_get_serial_sequence('"Categories"', 'Id'), 14);

-- ----------------------------------------------------------
-- 6. Proje üyelikleri
-- ----------------------------------------------------------
-- Kasıtlı olarak asimetrik: görünürlük filtresi sunumda gösterilebilsin.
-- Örnek: Kaan (9) yalnızca Mobil Uygulama üyesi, dolayısıyla BT Altyapı
-- taleplerini listede göremez; admin (1) hepsini görür.
INSERT INTO "ProjectMembers" ("ProjectId", "UserId") VALUES
    -- Kurumsal Portal
    (1, 2), (1, 4), (1, 8), (1, 10), (1, 14),
    -- Mobil Uygulama
    (2, 2), (2, 9), (2, 14),
    -- BT Altyapı
    (3, 3), (3, 5), (3, 6), (3, 10),
    -- Veri Ambarı
    (4, 7), (4, 11), (4, 8);

-- ----------------------------------------------------------
-- 7. Yetkiler (kullanıcı bazlı, proje kapsamı destekli)
-- ----------------------------------------------------------
-- ProjectId NULL = global yetki, dolu = yalnızca o projede geçerli.
-- Aynı gruptaki iki kullanıcının farklı yetkilere sahip olabildiğini
-- göstermek için Elif (4) ve Mert (5) bilinçli olarak ayrıştırıldı.
INSERT INTO "UserPermissions" ("UserId", "PermissionId", "ProjectId", "GrantedAt") VALUES
    -- Süper admin: her şey
    (1, 4, NULL, now()), (1, 1, NULL, now()), (1, 2, NULL, now()), (1, 3, NULL, now()),

    -- Deniz: Portal ve Mobil projelerinde yönetici yetkileri (proje kapsamlı)
    (2, 1, NULL, now()), (2, 2, 1, now()), (2, 3, 1, now()), (2, 2, 2, now()), (2, 3, 2, now()),

    -- Burak: BT Altyapı yöneticisi
    (3, 1, NULL, now()), (3, 2, 3, now()), (3, 3, 3, now()),

    -- Elif: destek uzmanı, atama + durum güncelleme (global)
    (4, 1, NULL, now()), (4, 2, NULL, now()), (4, 3, NULL, now()),

    -- Mert: aynı grupta ama yalnızca durum güncelleyebilir, atama yapamaz
    (5, 1, NULL, now()), (5, 3, NULL, now()),

    -- Ayşe ve Can: kendi projelerinde durum güncelleme
    (6, 1, NULL, now()), (6, 3, 3, now()),
    (7, 1, NULL, now()), (7, 3, 4, now()),

    -- Son kullanıcılar: yalnızca talep açabilir
    (8, 1, NULL, now()),
    (9, 1, NULL, now()),
    (10, 1, NULL, now()), (10, 3, 1, now()),
    (11, 1, NULL, now()),
    (14, 1, NULL, now()), (14, 2, 2, now());

-- ----------------------------------------------------------
-- 8. SLA tanımları
-- ----------------------------------------------------------
-- Dört katmanın tamamı örneklendi. TicketService en özelden en genele
-- doğru eşleşme arıyor:
--   1) Proje + Kategori + Öncelik
--   2) Proje + Öncelik
--   3) Kategori + Öncelik
--   4) yalnızca Öncelik  (genel varsayılan)
INSERT INTO "Slas" ("Id", "ProjectId", "CategoryId", "PriorityId", "ResponseTimeMinutes", "ResolutionTimeMinutes") VALUES
    -- 4. katman: genel varsayılan (her proje/kategori için geçerli)
    (1, NULL, NULL, 10, 30,  240),    -- Kritik
    (2, NULL, NULL, 20, 60,  480),    -- Yüksek
    (3, NULL, NULL, 30, 240, 1440),   -- Orta
    (4, NULL, NULL, 40, 480, 4320),   -- Düşük

    -- 3. katman: kategori + öncelik (proje bağımsız)
    (5, NULL, 9,  10, 15,  120),      -- Ağ/Bağlantı + Kritik

    -- 2. katman: proje + öncelik
    (6, 3, NULL, 10, 15,  90),        -- BT Altyapı + Kritik
    (7, 3, NULL, 20, 45,  360),       -- BT Altyapı + Yüksek

    -- 1. katman: proje + kategori + öncelik (en spesifik)
    (8, 3, 10, 10, 10,  60),          -- BT Altyapı + Sunucu/Servis + Kritik
    (9, 1, 1,  20, 30,  240),         -- Portal + Giriş + Yüksek
    (10, 2, 5, 10, 20,  120);         -- Mobil + Çökme + Kritik

SELECT setval(pg_get_serial_sequence('"Slas"', 'Id'), 10);

-- ----------------------------------------------------------
-- 9. Otomatik atama kuralları
-- ----------------------------------------------------------
-- Servis "tam olarak biri dolu" kuralını uyguluyor: ya kullanıcı ya grup.
-- Kategori bazlı kural, proje geneli kuraldan önce gelir; eşitlikte
-- PriorityOrder küçük olan kazanır.
INSERT INTO "AutoAssignmentRules" ("Id", "ProjectId", "CategoryId", "AssignToUserId", "AssignToGroupId", "PriorityOrder") VALUES
    -- Kategori bazlı: doğrudan kişiye
    (1, 3, 8,  6,    NULL, 1),   -- Donanım Arızası -> Ayşe
    (2, 1, 1,  2,    NULL, 1),   -- Portal/Giriş -> Deniz
    -- Kategori bazlı: gruba (en az yüklü aktif üyeye dağıtılır)
    (3, 3, 9,  NULL, 2,    1),   -- Ağ/Bağlantı -> Sistem & Network
    (4, 4, 12, NULL, 4,    1),   -- ETL Hatası -> Veritabanı Yönetimi
    -- Proje geneli yedek kural (CategoryId NULL): daha spesifik kural yoksa devreye girer
    (5, 3, NULL, NULL, 3,  5),   -- BT Altyapı geneli -> Destek Birimi
    (6, 2, NULL, NULL, 1,  5);   -- Mobil geneli -> Yazılım Geliştirme

SELECT setval(pg_get_serial_sequence('"AutoAssignmentRules"', 'Id'), 6);

-- ----------------------------------------------------------
-- 10. Talepler
-- ----------------------------------------------------------
-- Durum dağılımı (StatusId): 10 Açık, 20 Devam Ediyor, 30 Beklemede,
-- 40 Çözüldü, 50 Kapatıldı.  Öncelik (PriorityId): 10 Kritik ... 40 Düşük.
-- TicketType: 'Incident' | 'ServiceRequest' (enum adı olarak saklanıyor).
--
-- Tarihler now()'a göre göreli: script ne zaman çalıştırılırsa çalıştırılsın
-- "geçmiş", "yaklaşan" ve "gecikmiş" örnekleri tutarlı kalır.
INSERT INTO "Tickets"
    ("Id", "ProjectId", "CategoryId", "TicketType", "Title", "Description",
     "StatusId", "PriorityId", "CreatedBy", "AssignedTo", "SlaId", "DueAt", "ResolvedAt", "CreatedAt", "UpdatedAt")
VALUES
    -- --- GECİKMİŞ (SLA aşılmış) - kırmızı rozet + SLA ihlali demosu ---
    (1, 3, 10, 'Incident', 'Üretim veritabanı sunucusu yanıt vermiyor',
     'ERP uygulaması saat 09:15''ten beri veritabanına bağlanamıyor. Tüm kullanıcılar etkileniyor.',
     20, 10, 8, 3, 8, now() - interval '4 hours', NULL, now() - interval '8 hours', now() - interval '2 hours'),

    (2, 3, 9, 'Incident', 'Genel merkez internet bağlantısı kesintili',
     'Bağlantı 10 dakikada bir kopuyor. Video konferanslar sürekli düşüyor.',
     20, 10, 10, 6, 5, now() - interval '2 hours', NULL, now() - interval '6 hours', now() - interval '1 hour'),

    (3, 1, 3, 'Incident', 'Portal rapor sayfası zaman aşımına uğruyor',
     'Aylık satış raporu 30 saniyeden uzun sürüyor ve hata veriyor.',
     10, 20, 10, NULL, 2, now() - interval '1 hour', NULL, now() - interval '10 hours', now() - interval '10 hours'),

    -- --- YAKLAŞAN (2 saat içinde) - turuncu rozet demosu ---
    (4, 2, 5, 'Incident', 'Uygulama iOS 18''de açılışta kapanıyor',
     'iOS 18 güncellemesinden sonra uygulama splash ekranında kapanıyor.',
     20, 10, 9, 2, 10, now() + interval '1 hour', NULL, now() - interval '1 hour', now()),

    (5, 1, 1, 'Incident', 'Kullanıcılar tek seferlik koda erişemiyor',
     'SMS doğrulama kodu gelmiyor, kullanıcılar giriş yapamıyor.',
     20, 20, 8, 2, 9, now() + interval '90 minutes', NULL, now() - interval '2 hours', now()),

    -- --- AÇIK, normal akış ---
    (6, 3, 8, 'Incident', 'Muhasebe katındaki yazıcı kağıt sıkıştırıyor',
     'HP LaserJet cihazı her yazdırmada kağıt sıkıştırıyor.',
     10, 30, 10, 6, 3, now() + interval '20 hours', NULL, now() - interval '4 hours', now() - interval '4 hours'),

    (7, 1, 2, 'Incident', 'Sipariş formunda tarih alanı hatalı görünüyor',
     'Tarih seçici Safari''de yanlış ay gösteriyor.',
     10, 30, 14, NULL, 3, now() + interval '22 hours', NULL, now() - interval '2 hours', now() - interval '2 hours'),

    (8, 4, 12, 'Incident', 'Gecelik ETL işi başarısız oldu',
     'Satış veri aktarımı 03:00''te hata verdi, ambar güncel değil.',
     10, 20, 11, 7, 2, now() + interval '6 hours', NULL, now() - interval '2 hours', now() - interval '2 hours'),

    (9, 2, 6, 'Incident', 'Android cihazlara push bildirim gitmiyor',
     'Kampanya bildirimleri yalnızca iOS cihazlara ulaşıyor.',
     10, 20, 9, NULL, 2, now() + interval '7 hours', NULL, now() - interval '1 hour', now() - interval '1 hour'),

    (10, 3, 11, 'ServiceRequest', 'Yeni ekip üyesi için ofis yazılımı kurulumu',
     'Pazarlama ekibine katılan kişi için lisans ve kurulum gerekiyor.',
     10, 40, 4, NULL, 4, now() + interval '3 days', NULL, now() - interval '6 hours', now() - interval '6 hours'),

    -- --- DEVAM EDİYOR ---
    (11, 1, 4, 'ServiceRequest', 'Portala toplu dışa aktarma özelliği eklensin',
     'Kullanıcılar sipariş listesini Excel olarak indirmek istiyor.',
     20, 30, 8, 2, 3, now() + interval '18 hours', NULL, now() - interval '3 days', now() - interval '1 day'),

    (12, 4, 14, 'Incident', 'Stok raporu kaynak sistemle uyuşmuyor',
     'Ambar raporundaki stok adetleri ERP''den farklı.',
     20, 20, 11, 7, 2, now() + interval '4 hours', NULL, now() - interval '1 day', now() - interval '4 hours'),

    (13, 2, 7, 'Incident', 'Küçük ekranlı cihazlarda buton görünmüyor',
     'Ödeme ekranındaki onay butonu küçük ekranlarda kesiliyor.',
     20, 30, 14, 2, 3, now() + interval '16 hours', NULL, now() - interval '2 days', now() - interval '5 hours'),

    -- --- BEKLEMEDE (üçüncü taraf/onay bekliyor) ---
    (14, 3, 10, 'Incident', 'Yedekleme servisi aralıklı olarak duruyor',
     'Gece yedeklemesi haftada bir başarısız oluyor. Donanım tedarikçisi inceliyor.',
     30, 20, 3, 6, 7, now() + interval '2 days', NULL, now() - interval '5 days', now() - interval '2 days'),

    (15, 1, 4, 'ServiceRequest', 'Yeni ödeme sağlayıcısı entegrasyonu',
     'Sözleşme onayı bekleniyor, sonrasında geliştirme başlayacak.',
     30, 30, 2, 2, 3, now() + interval '10 days', NULL, now() - interval '12 days', now() - interval '6 days'),

    (16, 4, 13, 'ServiceRequest', 'Bölge bazlı satış raporu talebi',
     'Yönetim onayı bekleniyor.',
     30, 40, 8, 7, 4, now() + interval '15 days', NULL, now() - interval '9 days', now() - interval '4 days'),

    -- --- ÇÖZÜLDÜ (bugün - "Bugün Çözülen" KPI'ı için) ---
    (17, 3, 9, 'Incident', 'VPN bağlantısı uzaktan çalışanlarda kopuyor',
     'VPN sunucusu yeniden başlatıldı, bağlantı stabil.',
     40, 20, 10, 6, 5, now() - interval '1 day', now() - interval '3 hours', now() - interval '2 days', now() - interval '3 hours'),

    (18, 1, 2, 'Incident', 'Profil fotoğrafı yüklenemiyor',
     'Dosya boyutu limiti düzeltildi.',
     40, 30, 8, 2, 3, now() + interval '5 hours', now() - interval '5 hours', now() - interval '1 day', now() - interval '5 hours'),

    (19, 2, 5, 'Incident', 'Ürün listesinde kaydırma takılıyor',
     'Liste sanallaştırma eklendi, performans düzeldi.',
     40, 30, 9, 2, 3, now() + interval '2 hours', now() - interval '1 hour', now() - interval '1 day', now() - interval '1 hour'),

    -- --- ÇÖZÜLDÜ (geçmiş günler) ---
    (20, 3, 8, 'Incident', 'Dizüstü bilgisayar şarj olmuyor',
     'Adaptör değiştirildi.',
     40, 30, 4, 6, 3, now() - interval '3 days', now() - interval '4 days', now() - interval '5 days', now() - interval '4 days'),

    (21, 1, 3, 'Incident', 'Arama sonuçları yavaş dönüyor',
     'Veritabanı indeksi eklendi.',
     40, 20, 10, 2, 3, now() - interval '6 days', now() - interval '7 days', now() - interval '8 days', now() - interval '7 days'),

    (22, 4, 12, 'Incident', 'Müşteri verisi aktarımı yarım kaldı',
     'Kaynak dosyadaki bozuk satır düzeltildi.',
     40, 20, 11, 7, 2, now() - interval '10 days', now() - interval '11 days', now() - interval '12 days', now() - interval '11 days'),

    -- --- KAPATILDI ---
    (23, 3, 11, 'ServiceRequest', 'Tasarım ekibi için lisans talebi',
     'Lisanslar satın alındı ve kuruldu.',
     50, 40, 4, 6, 4, now() - interval '15 days', now() - interval '17 days', now() - interval '20 days', now() - interval '16 days'),

    (24, 1, 1, 'Incident', 'Şifre sıfırlama e-postası gelmiyor',
     'SMTP ayarları düzeltildi.',
     50, 20, 8, 2, 9, now() - interval '18 days', now() - interval '19 days', now() - interval '20 days', now() - interval '18 days'),

    (25, 2, 6, 'Incident', 'Bildirim sesi çalmıyor',
     'Kanal yapılandırması güncellendi.',
     50, 30, 9, 2, 3, now() - interval '22 days', now() - interval '23 days', now() - interval '25 days', now() - interval '23 days'),

    (26, 3, 9, 'Incident', 'Toplantı odasında kablosuz ağ zayıf',
     'Ek erişim noktası kuruldu.',
     50, 30, 10, 6, 5, now() - interval '28 days', now() - interval '29 days', now() - interval '31 days', now() - interval '29 days'),

    (27, 4, 13, 'ServiceRequest', 'Aylık performans raporu',
     'Rapor hazırlandı ve teslim edildi.',
     50, 40, 11, 7, 4, now() - interval '30 days', now() - interval '32 days', now() - interval '35 days', now() - interval '32 days'),

    -- --- Ek açık talepler (liste/sayfalama/filtre demosu için) ---
    (28, 1, 2, 'Incident', 'Menü ikonları bazı tarayıcılarda bozuk',
     'Font dosyası yüklenemiyor olabilir.',
     10, 40, 14, NULL, 4, now() + interval '3 days', NULL, now() - interval '3 days', now() - interval '3 days'),

    (29, 2, 7, 'ServiceRequest', 'Tablet desteği eklensin',
     'Tablet ekran düzeni talebi.',
     10, 40, 9, NULL, 4, now() + interval '4 days', NULL, now() - interval '4 days', now() - interval '4 days'),

    (30, 3, 8, 'Incident', 'Klavye tuşları çalışmıyor',
     'Birkaç tuş yanıt vermiyor.',
     10, 30, 5, 6, 3, now() + interval '1 day', NULL, now() - interval '7 hours', now() - interval '7 hours'),

    (31, 4, 14, 'Incident', 'Müşteri sayısı raporda eksik görünüyor',
     'Filtre mantığı incelenmeli.',
     10, 30, 7, NULL, 3, now() + interval '1 day', NULL, now() - interval '9 hours', now() - interval '9 hours'),

    (32, 1, 4, 'ServiceRequest', 'Koyu tema desteği',
     'Kullanıcılardan gelen yoğun istek.',
     10, 40, 10, NULL, 4, now() + interval '5 days', NULL, now() - interval '5 days', now() - interval '5 days'),

    (33, 3, 10, 'Incident', 'Disk alanı kritik seviyede',
     'Uygulama sunucusunda %92 doluluk.',
     20, 20, 3, 3, 7, now() + interval '3 hours', NULL, now() - interval '3 hours', now() - interval '1 hour'),

    (34, 2, 5, 'Incident', 'Arama ekranında beklenmedik kapanma',
     'Uzun arama metinlerinde kapanıyor.',
     20, 20, 14, 2, 3, now() + interval '8 hours', NULL, now() - interval '5 hours', now() - interval '2 hours'),

    (35, 1, 1, 'Incident', 'Oturum beklenenden erken sonlanıyor',
     'Kullanıcılar 10 dakikada bir yeniden giriş yapmak zorunda.',
     20, 20, 8, 2, 9, now() + interval '3 hours', NULL, now() - interval '4 hours', now() - interval '1 hour'),

    (36, 4, 12, 'Incident', 'Stok aktarımı çok yavaş',
     'Gece işi 6 saat sürüyor.',
     30, 30, 11, 7, 3, now() + interval '2 days', NULL, now() - interval '6 days', now() - interval '3 days'),

    (37, 3, 11, 'ServiceRequest', 'Geliştirici araçları kurulumu',
     'Yeni geliştirici için ortam hazırlığı.',
     40, 40, 2, 6, 4, now() - interval '1 day', now() - interval '2 hours', now() - interval '3 days', now() - interval '2 hours'),

    (38, 1, 3, 'Incident', 'Dosya yükleme işlemi yavaş',
     'Büyük dosyalarda zaman aşımı.',
     40, 30, 10, 2, 3, now() - interval '2 days', now() - interval '2 days', now() - interval '4 days', now() - interval '2 days'),

    (39, 2, 6, 'Incident', 'Bildirim rozetleri güncellenmiyor',
     'Okunmamış sayısı sıfırlanmıyor.',
     50, 30, 9, 2, 3, now() - interval '12 days', now() - interval '13 days', now() - interval '15 days', now() - interval '13 days'),

    (40, 3, 9, 'ServiceRequest', 'Misafir kablosuz ağı talebi',
     'Ziyaretçiler için ayrı ağ oluşturuldu.',
     50, 40, 4, 6, 4, now() - interval '35 days', now() - interval '36 days', now() - interval '40 days', now() - interval '36 days');

SELECT setval(pg_get_serial_sequence('"Tickets"', 'Id'), 40);

-- ----------------------------------------------------------
-- 11. Yorumlar
-- ----------------------------------------------------------
-- IsInternal = true olanlar yalnızca yetkili personele gösterilir.
INSERT INTO "Comments" ("TicketId", "UserId", "Message", "IsInternal", "CreatedAt") VALUES
    (1, 8,  'Sabahtan beri hiçbir işlem yapamıyoruz, durum kritik.',            false, now() - interval '7 hours'),
    (1, 3,  'Sunucuya bağlandım, bağlantı havuzu dolmuş durumda. İnceliyorum.', false, now() - interval '6 hours'),
    (1, 3,  'Not: bağlantı sızıntısı son sürümdeki rapor modülünden geliyor.',  true,  now() - interval '5 hours'),
    (2, 10, 'Toplantı sırasında üç kez bağlantı koptu.',                        false, now() - interval '5 hours'),
    (2, 6,  'Switch loglarına bakıyorum, port hatası görünüyor.',               false, now() - interval '4 hours'),
    (4, 9,  'App Store yorumlarında da aynı şikayet var.',                      false, now() - interval '50 minutes'),
    (4, 2,  'iOS 18 SDK uyumsuzluğu, düzeltme hazırlanıyor.',                   false, now() - interval '30 minutes'),
    (5, 8,  'Müşteri temsilcileri sürekli çağrı alıyor.',                       false, now() - interval '90 minutes'),
    (5, 2,  'SMS sağlayıcısının kotası dolmuş - hesabı yükselttik.',            true,  now() - interval '45 minutes'),
    (11, 8, 'Excel formatı yeterli, PDF şart değil.',                           false, now() - interval '2 days'),
    (14, 6, 'Tedarikçi RAID denetleyicisini değiştirecek.',                     true,  now() - interval '2 days'),
    (17, 6, 'VPN sunucusu yeniden başlatıldı, izlemeye devam ediyorum.',        false, now() - interval '4 hours'),
    (17, 10,'Teşekkürler, bağlantı stabil görünüyor.',                          false, now() - interval '3 hours'),
    (33, 3, 'Eski log dosyaları arşivlenecek.',                                 false, now() - interval '2 hours'),
    (35, 8, 'Bugün üçüncü kez giriş yapmak zorunda kaldım.',                    false, now() - interval '3 hours');

-- ----------------------------------------------------------
-- 12. Atama geçmişi
-- ----------------------------------------------------------
INSERT INTO "TicketAssignments" ("TicketId", "AssignedFrom", "AssignedTo", "AssignedBy", "Note", "AssignedAt") VALUES
    (1,  NULL, 3, 1, 'Kritik üretim sorunu, doğrudan sistem ekibine.', now() - interval '7 hours'),
    (2,  NULL, 6, 1, 'Otomatik atama kuralına göre atandı.',           now() - interval '6 hours'),
    (4,  NULL, 2, 1, NULL,                                            now() - interval '1 hour'),
    (5,  NULL, 2, 1, 'Otomatik atama kuralına göre atandı.',           now() - interval '2 hours'),
    (6,  NULL, 6, 1, 'Otomatik atama kuralına göre atandı.',           now() - interval '4 hours'),
    (17, NULL, 6, 1, 'Otomatik atama kuralına göre atandı.',           now() - interval '2 days'),
    (33, NULL, 3, 1, NULL,                                            now() - interval '3 hours');

-- ----------------------------------------------------------
-- 13. Durum geçiş geçmişi
-- ----------------------------------------------------------
INSERT INTO "TicketStatusHistories" ("TicketId", "OldStatusId", "NewStatusId", "ChangedBy", "ChangedAt") VALUES
    (1,  10, 20, 3, now() - interval '6 hours'),
    (2,  10, 20, 6, now() - interval '5 hours'),
    (4,  10, 20, 2, now() - interval '45 minutes'),
    (5,  10, 20, 2, now() - interval '90 minutes'),
    (14, 10, 20, 6, now() - interval '4 days'),
    (14, 20, 30, 6, now() - interval '2 days'),
    (17, 10, 20, 6, now() - interval '1 day'),
    (17, 20, 40, 6, now() - interval '3 hours'),
    (20, 10, 40, 6, now() - interval '4 days'),
    (23, 10, 40, 6, now() - interval '17 days'),
    (23, 40, 50, 1, now() - interval '16 days'),
    (24, 10, 40, 2, now() - interval '19 days'),
    (24, 40, 50, 1, now() - interval '18 days');

-- ----------------------------------------------------------
-- 14. Bilgi bankası makaleleri
-- ----------------------------------------------------------
-- IsPublished = false olanlar yalnızca yetkili kullanıcılara görünür.
INSERT INTO "KnowledgeBaseArticles" ("ProjectId", "CategoryId", "Title", "Content", "IsPublished", "CreatedBy", "CreatedAt", "UpdatedAt") VALUES
    (1, 1, 'Şifremi unuttum, ne yapmalıyım?',
     E'1. Giriş ekranındaki "Şifremi unuttum" bağlantısına tıklayın.\n2. Kurumsal e-posta adresinizi girin.\n3. Gelen bağlantı 30 dakika geçerlidir.\n\nE-posta ulaşmazsa spam klasörünü kontrol edin, sonrasında destek birimine talep açın.',
     true, 2, now() - interval '60 days', now() - interval '60 days'),

    (3, 9, 'VPN bağlantısı nasıl kurulur?',
     E'1. Kurumsal VPN istemcisini yükleyin.\n2. Sunucu adresi: vpn.sirket.local\n3. Kullanıcı adı ve şifreniz portal ile aynıdır.\n\nBağlantı kurulamıyorsa önce internet bağlantınızı doğrulayın.',
     true, 3, now() - interval '55 days', now() - interval '20 days'),

    (3, 8, 'Yazıcı kağıt sıkışması nasıl giderilir?',
     E'1. Yazıcıyı kapatın.\n2. Arka kapağı açıp sıkışan kağıdı yavaşça çekin.\n3. Kapağı kapatıp cihazı yeniden başlatın.\n\nSorun tekrarlıyorsa donanım arızası kaydı açın.',
     true, 6, now() - interval '45 days', now() - interval '45 days'),

    (2, 5, 'Mobil uygulama çökmelerinde toplanacak bilgiler',
     E'Talep açarken şunları ekleyin:\n- Cihaz modeli ve işletim sistemi sürümü\n- Uygulama sürümü\n- Çökme öncesi yapılan işlem\n- Varsa ekran görüntüsü',
     true, 2, now() - interval '40 days', now() - interval '40 days'),

    (4, 12, 'ETL hata kodları referansı',
     E'E-1001: Kaynak dosya bulunamadı\nE-1002: Şema uyuşmazlığı\nE-2001: Hedef tabloya yazma hatası\n\nHer kod için ayrıntılı çözüm adımları ekibimizce güncellenmektedir.',
     true, 7, now() - interval '30 days', now() - interval '10 days'),

    (1, 3, 'Portal performans sorunlarında ilk kontroller',
     E'- Tarayıcı önbelleğini temizleyin\n- Farklı bir tarayıcıda deneyin\n- Ağ bağlantı hızınızı ölçün\n\nSorun sürüyorsa saat bilgisiyle birlikte talep açın.',
     true, 2, now() - interval '25 days', now() - interval '25 days'),

    -- Taslak: yayınlanmamış, görünürlük demosu için
    (3, 10, 'Sunucu bakım prosedürü (taslak)',
     E'Bu doküman henüz gözden geçirilmedi.\n\nPlanlanan bakım pencereleri ve geri alma adımları yazılacak.',
     false, 3, now() - interval '5 days', now() - interval '2 days'),

    (NULL, NULL, 'Talep açarken dikkat edilecekler',
     E'İyi bir talep şunları içerir:\n- Net bir başlık\n- Sorunun ne zaman başladığı\n- Tekrar üretme adımları\n- Etkilenen kullanıcı sayısı\n\nDoğru öncelik seçimi çözüm süresini kısaltır.',
     true, 1, now() - interval '70 days', now() - interval '70 days');

COMMIT;

-- ==========================================================
-- ÖZET
-- ==========================================================
-- 14 kullanıcı (1 pasif, 1 İngilizce tercihli), 5 grup, 4 proje,
-- 14 kategori, 40 talep, 10 SLA tanımı (4 katmanın tamamı),
-- 6 otomatik atama kuralı, 15 yorum, 8 bilgi bankası makalesi.
--
-- Tüm şifreler: 12345
-- Admin girişi:  admin@itsm.local
--
-- Notification, SlaBreach ve AuditLog kayıtları bilinçli olarak
-- eklenmedi: bunlar uygulama çalışırken doğal olarak oluşmalı.
-- SLA'sı aşmış talepler (1, 2, 3) arka plan servisi çalıştığında
-- ihlal kaydı ve bildirim üretecek - sunumda bu akış canlı izlenebilir.
-- ==========================================================

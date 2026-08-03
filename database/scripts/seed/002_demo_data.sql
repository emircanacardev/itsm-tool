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
    (4, 'ADMIN_MANAGE',         'Admin İşlemleri',   'Grup, kullanıcı, yetki, proje yönetimi yapabilir'),
    -- Proje kapsamlı verilebiliyor: UserPermissions.ProjectId dolu olduğunda
    -- kullanıcı yalnızca o projenin kategori/ekip yönetimini yapabiliyor.
    (5, 'PROJECT_MANAGE',       'Proje Yönetimi',    'Bir projenin kategori ve ekip üyelerini yönetebilir');

SELECT setval(pg_get_serial_sequence('"Permissions"', 'Id'), 5);

-- ----------------------------------------------------------
-- 2. Gruplar (iş birimleri)
-- ----------------------------------------------------------
INSERT INTO "Groups" ("Id", "Name", "SystemKey", "Description", "CreatedAt") VALUES
    (1, 'Yazılım Geliştirme',  NULL,         'Uygulama geliştirme ekibi',                  now()),
    (2, 'Sistem & Network',    NULL,         'Sistem yönetimi ve network operasyonları',   now()),
    (3, 'Destek Birimi',       NULL,         'Birinci seviye destek / help desk',          now()),
    (4, 'Veritabanı Yönetimi', NULL,         'DB yönetimi ve bakım ekibi',                 now()),
    -- SystemKey dolu: kayıt akışı bu grubu adına göre değil anahtarına göre bulur.
    (5, 'Atanmamış',           'UNASSIGNED', 'Kayıt olan yeni kullanıcıların varsayılan grubu', now()),
    -- Staj yapılan birimdeki gerçek ekipler
    (6, 'Ice Age',             NULL,         'Ürün geliştirme ekibi',                      now()),
    (7, 'Jetgiller',           NULL,         'Ürün geliştirme ekibi',                      now()),
    (8, 'Monitoring',          NULL,         'Sistem izleme ve alarm yönetimi ekibi',      now()),
    (9, 'SMS',                 NULL,         'SMS altyapı ve mesajlaşma servisleri ekibi', now());

SELECT setval(pg_get_serial_sequence('"Groups"', 'Id'), 9);

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
    (14, 1, 'John Smith',       'john@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'en', now() - interval '55 days',  now()),

    -- Sonradan açılan projelerin (İK Portali, E-Ticaret, Çağrı Merkezi) ekipleri
    (15, 1, 'Merve Şen',        'merve@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '50 days',  now()),
    (16, 3, 'Emre Kılıç',       'emre@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '48 days',  now()),
    (17, 2, 'Gizem Aksoy',      'gizem@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '45 days',  now()),
    (18, 1, 'Tolga Erdem',      'tolga@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '42 days',  now()),
    (19, 4, 'Sibel Yalçın',     'sibel@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '40 days',  now()),
    (20, 3, 'Kerem Bulut',      'kerem@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '38 days',  now()),
    -- İkinci İngilizce tercihli kullanıcı: çok dilli ekip senaryosu
    (21, 1, 'Anna Novak',       'anna@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'en', now() - interval '35 days',  now()),
    (22, 3, 'Furkan Aslan',     'furkan@itsm.local',   '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '30 days',  now()),

    -- Ice Age ekibi
    (23, 6, 'Serkan Yıldırım',  'serkan@itsm.local',   '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '28 days',  now()),
    (24, 6, 'Pelin Uçar',       'pelin@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '27 days',  now()),
    -- Jetgiller ekibi
    (25, 7, 'Barış Tunç',       'baris@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '26 days',  now()),
    (26, 7, 'Ceren Aktaş',      'ceren@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '25 days',  now()),
    -- Monitoring ekibi (7/24 alarm takibi)
    (27, 8, 'Hakan Demirel',    'hakan@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '24 days',  now()),
    (28, 8, 'Nazlı Ergin',      'nazli@itsm.local',    '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '23 days',  now()),
    -- SMS ekibi
    (29, 9, 'Okan Çetin',       'okan@itsm.local',     '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '22 days',  now()),
    (30, 9, 'Dilara Koç',       'dilara@itsm.local',   '$2a$11$GvCPg63qa0ObgS6gDHMDKuPNWyQWMBf.1TPBJXurIerWCVNYODxui', true,  'tr', now() - interval '21 days',  now());

SELECT setval(pg_get_serial_sequence('"Users"', 'Id'), 30);

-- ----------------------------------------------------------
-- 4. Projeler
-- ----------------------------------------------------------
INSERT INTO "Projects" ("Id", "Name", "Code", "Description", "IsActive", "CreatedAt") VALUES
    (1, 'Kurumsal Portal',    'PORTAL', 'Müşteri self-servis portali ve web uygulaması', true, now() - interval '120 days'),
    (2, 'Mobil Uygulama',     'MOBILE', 'iOS ve Android müşteri uygulaması',             true, now() - interval '100 days'),
    (3, 'BT Altyapı',         'INFRA',  'Sunucu, network ve donanım operasyonları',      true, now() - interval '115 days'),
    (4, 'Veri Ambarı',        'DWH',    'Raporlama ve veri ambarı platformu',            true, now() - interval '80 days'),
    (5, 'İK Portali',         'IKP',    'İnsan kaynakları self-servis uygulaması',       true, now() - interval '70 days'),
    (6, 'E-Ticaret Sitesi',   'SHOP',   'Online satış kanalı ve ödeme altyapısı',        true, now() - interval '60 days'),
    (7, 'Çağrı Merkezi',      'CALL',   'Çağrı merkezi yazılımı ve telefon altyapısı',   true, now() - interval '50 days'),
    -- Arşivlenmiş proje: IsActive = false. Kapatılmış bir projenin verisinin
    -- korunduğunu ama listelerde ayrışabildiğini göstermek için.
    (8, 'Eski İntranet',      'OLDNET', 'Kullanımdan kaldırılan eski intranet portali',  false, now() - interval '200 days'),
    -- Staj yapılan birimin ekiplerine ait projeler
    (9,  'Monitoring Platformu', 'MON',  'Sistem izleme, alarm ve nöbet yönetimi',      true, now() - interval '150 days'),
    (10, 'SMS Gateway',          'SMSGW','SMS gönderim altyapısı ve operatör entegrasyonları', true, now() - interval '140 days');

SELECT setval(pg_get_serial_sequence('"Projects"', 'Id'), 10);

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
    (14, 4, 'Veri Tutarsızlığı',        'Kaynak ile ambar arasındaki farklar'),
    -- İK Portali
    (15, 5, 'İzin Talepleri',           'İzin başvurusu ve onay akışı sorunları'),
    (16, 5, 'Bordro / Özlük',           'Maaş bordrosu ve özlük bilgisi erişimi'),
    (17, 5, 'Performans Modülü',        'Hedef ve değerlendirme ekranları'),
    (18, 5, 'Yetkilendirme',            'Rol ve erişim düzeyi sorunları'),
    -- E-Ticaret Sitesi
    (19, 6, 'Ödeme / Tahsilat',         'Kredi kartı ve ödeme sağlayıcı sorunları'),
    (20, 6, 'Sipariş Yönetimi',         'Sipariş oluşturma, iptal ve iade'),
    (21, 6, 'Kargo Entegrasyonu',       'Kargo firması servis entegrasyonları'),
    (22, 6, 'Ürün Kataloğu',            'Ürün, stok ve fiyat görüntüleme'),
    (23, 6, 'Kampanya / İndirim',       'Kupon ve kampanya kuralları'),
    -- Çağrı Merkezi
    (24, 7, 'Telefon Altyapısı',        'Santral, hat ve ses kalitesi sorunları'),
    (25, 7, 'CRM Entegrasyonu',         'Müşteri kaydı ve çağrı geçmişi eşleşmesi'),
    (26, 7, 'Çağrı Yönlendirme',        'IVR ve kuyruk yapılandırması'),
    -- Eski İntranet (arşiv)
    (27, 8, 'Genel',                    'Arşivlenmiş projenin genel kategorisi'),
    -- Monitoring Platformu
    (28, 9, 'Alarm Yönetimi',           'Yanlış/eksik alarm ve eşik ayarları'),
    (29, 9, 'Dashboard / Grafik',       'İzleme panoları ve metrik görselleştirme'),
    (30, 9, 'Agent / Veri Toplama',     'Sunuculardaki izleme ajanı sorunları'),
    (31, 9, 'Nöbet & Eskalasyon',       'Nöbet çizelgesi ve çağrı zinciri'),
    -- SMS Gateway
    (32, 10, 'Gönderim Hatası',         'Mesajın iletilememesi ve hata kodları'),
    (33, 10, 'Operatör Entegrasyonu',   'Operatör bağlantıları ve protokol sorunları'),
    (34, 10, 'Kuyruk / Performans',     'Gönderim kuyruğu birikmesi ve gecikme'),
    (35, 10, 'Raporlama',               'Gönderim raporları ve teslim durumları');

SELECT setval(pg_get_serial_sequence('"Categories"', 'Id'), 35);

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
    (4, 7), (4, 11), (4, 8),
    -- İK Portali (Merve yönetiyor; Zeynep hem Portal hem İK üyesi)
    (5, 15), (5, 18), (5, 8), (5, 21),
    -- E-Ticaret Sitesi (en kalabalık ekip)
    (6, 17), (6, 16), (6, 20), (6, 2), (6, 9), (6, 21),
    -- Çağrı Merkezi (Ayşe, telefon altyapısı kuralı onun grubunu hedeflediği
    -- için üye: atandığı talebi görebilmesi gerekiyor)
    (7, 22), (7, 19), (7, 4), (7, 16), (7, 6),
    -- Eski İntranet: arşiv projesinde yalnızca bir sorumlu kaldı
    (8, 3),
    -- Monitoring Platformu: Monitoring ekibi + Ice Age'den destek
    (9, 27), (9, 28), (9, 23), (9, 3),
    -- SMS Gateway: SMS ekibi + Jetgiller'den destek
    (10, 29), (10, 30), (10, 25), (10, 26),
    -- Ice Age ve Jetgiller kendi ürün projelerinde de üye
    (1, 23), (1, 24),
    (2, 25), (2, 26);

-- ----------------------------------------------------------
-- 7. Yetkiler (kullanıcı bazlı, proje kapsamı destekli)
-- ----------------------------------------------------------
-- ProjectId NULL = global yetki, dolu = yalnızca o projede geçerli.
-- Aynı gruptaki iki kullanıcının farklı yetkilere sahip olabildiğini
-- göstermek için Elif (4) ve Mert (5) bilinçli olarak ayrıştırıldı.
INSERT INTO "UserPermissions" ("UserId", "PermissionId", "ProjectId", "GrantedAt") VALUES
    -- Süper admin: her şey
    (1, 4, NULL, now()), (1, 1, NULL, now()), (1, 2, NULL, now()), (1, 3, NULL, now()),

    -- Deniz: Portal ve Mobil projelerinde yönetici yetkileri (proje kapsamlı).
    -- PROJECT_MANAGE yalnızca Portal'da: admin olmadan da o projenin kategori
    -- ve ekip yönetimini yapabiliyor, ama Mobil'de yapamıyor - proje kapsamlı
    -- yetkinin gerçekten kapsandığını canlı göstermek için bilerek tek proje.
    (2, 1, NULL, now()), (2, 2, 1, now()), (2, 3, 1, now()), (2, 2, 2, now()), (2, 3, 2, now()),
    (2, 5, 1, now()),

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
    (14, 1, NULL, now()), (14, 2, 2, now()),

    -- Merve: İK Portali yöneticisi (atama + durum, yalnızca kendi projesinde)
    (15, 1, NULL, now()), (15, 2, 5, now()), (15, 3, 5, now()),

    -- Emre: iki projede birden yetkili (E-Ticaret + Çağrı Merkezi)
    (16, 1, NULL, now()), (16, 3, 6, now()), (16, 3, 7, now()),

    -- Gizem: E-Ticaret yöneticisi
    (17, 1, NULL, now()), (17, 2, 6, now()), (17, 3, 6, now()),

    -- Tolga: İK'da yalnızca durum güncelleyebilir
    (18, 1, NULL, now()), (18, 3, 5, now()),

    -- Sibel: Çağrı Merkezi'nde atama yetkisi
    (19, 1, NULL, now()), (19, 2, 7, now()), (19, 3, 7, now()),

    -- Kerem ve Furkan: son kullanıcı
    (20, 1, NULL, now()),
    (22, 1, NULL, now()),

    -- Anna (en): iki projede üye, E-Ticaret'te durum güncelleyebilir
    (21, 1, NULL, now()), (21, 3, 6, now()),

    -- Ice Age ekibi
    (23, 1, NULL, now()), (23, 2, 9, now()), (23, 3, 9, now()),
    (24, 1, NULL, now()), (24, 3, 1, now()),

    -- Jetgiller ekibi
    (25, 1, NULL, now()), (25, 2, 10, now()), (25, 3, 10, now()),
    (26, 1, NULL, now()), (26, 3, 2, now()),

    -- Monitoring ekibi: 7/24 nöbet tuttukları için atama yetkisi global
    (27, 1, NULL, now()), (27, 2, NULL, now()), (27, 3, NULL, now()),
    (28, 1, NULL, now()), (28, 3, 9, now()),

    -- SMS ekibi
    (29, 1, NULL, now()), (29, 2, 10, now()), (29, 3, 10, now()),
    (30, 1, NULL, now()), (30, 3, 10, now());

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
    (10, 2, 5, 10, 20,  120),         -- Mobil + Çökme + Kritik

    -- E-Ticaret: ödeme kesintisi doğrudan ciro kaybı, en sıkı SLA burada
    (11, 6, 19, 10, 5,  30),          -- E-Ticaret + Ödeme + Kritik
    (12, 6, 19, 20, 15, 120),         -- E-Ticaret + Ödeme + Yüksek
    (13, 6, NULL, 10, 10, 60),        -- E-Ticaret geneli + Kritik

    -- Çağrı Merkezi: telefon altyapısı kesintisi operasyonu durdurur
    (14, 7, 24, 10, 10, 45),          -- Çağrı + Telefon Altyapısı + Kritik
    (15, 7, NULL, 20, 30, 240),       -- Çağrı geneli + Yüksek

    -- İK Portali: iş kritikliği düşük, süreler daha rahat
    (16, 5, 16, 20, 120, 960),        -- İK + Bordro/Özlük + Yüksek
    (17, 5, NULL, 30, 480, 2880),     -- İK geneli + Orta

    -- Monitoring: alarm körlüğü tüm sistemleri riske atar, en agresif süreler
    (18, 9, 28, 10, 5,  30),          -- Monitoring + Alarm Yönetimi + Kritik
    (19, 9, 30, 20, 20, 180),         -- Monitoring + Agent + Yüksek
    (20, 9, NULL, 10, 10, 60),        -- Monitoring geneli + Kritik

    -- SMS Gateway: gönderim kesintisi doğrudan müşteriye yansır
    (21, 10, 32, 10, 5,  45),         -- SMS + Gönderim Hatası + Kritik
    (22, 10, 33, 10, 10, 90),         -- SMS + Operatör Entegrasyonu + Kritik
    (23, 10, NULL, 20, 30, 240);      -- SMS geneli + Yüksek

SELECT setval(pg_get_serial_sequence('"Slas"', 'Id'), 23);

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
    (6, 2, NULL, NULL, 1,  5),   -- Mobil geneli -> Yazılım Geliştirme

    -- E-Ticaret: ödeme sorunları doğrudan Gizem'e, kalanı yazılım ekibine
    (7, 6, 19, 17,   NULL, 1),   -- Ödeme/Tahsilat -> Gizem
    (8, 6, 21, NULL, 1,    2),   -- Kargo Entegrasyonu -> Yazılım Geliştirme
    (9, 6, NULL, NULL, 1,  5),   -- E-Ticaret geneli -> Yazılım Geliştirme

    -- Çağrı Merkezi: telefon altyapısı sistem ekibine
    (10, 7, 24, NULL, 2,  1),    -- Telefon Altyapısı -> Sistem & Network
    (11, 7, NULL, NULL, 3, 5),   -- Çağrı geneli -> Destek Birimi

    -- İK Portali: tüm talepler Merve'ye
    (12, 5, NULL, 15, NULL, 5),  -- İK geneli -> Merve

    -- Monitoring: alarm konuları doğrudan nöbetçi ekibe
    (13, 9, 28, NULL, 8,  1),    -- Alarm Yönetimi -> Monitoring ekibi
    (14, 9, 31, 27,   NULL, 1),  -- Nöbet & Eskalasyon -> Hakan
    (15, 9, NULL, NULL, 8, 5),   -- Monitoring geneli -> Monitoring ekibi

    -- SMS Gateway: operatör tarafı SMS ekibinde
    (16, 10, 33, NULL, 9, 1),    -- Operatör Entegrasyonu -> SMS ekibi
    (17, 10, NULL, NULL, 9, 5);  -- SMS geneli -> SMS ekibi

SELECT setval(pg_get_serial_sequence('"AutoAssignmentRules"', 'Id'), 17);

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
     50, 40, 4, 6, 4, now() - interval '35 days', now() - interval '36 days', now() - interval '40 days', now() - interval '36 days'),

    -- =======================================================
    -- E-TİCARET SİTESİ (Proje 6) - en yoğun proje
    -- =======================================================
    -- Gecikmiş kritik: ödeme kesintisi, en sıkı SLA (5dk/30dk)
    (41, 6, 19, 'Incident', 'Kredi kartı ödemeleri reddediliyor',
     'Son 40 dakikadır tüm kart ödemeleri "işlem başarısız" dönüyor. Sipariş alınamıyor.',
     20, 10, 17, 17, 11, now() - interval '30 minutes', NULL, now() - interval '1 hour', now() - interval '20 minutes'),

    (42, 6, 20, 'Incident', 'Sipariş iptali stok iadesi yapmıyor',
     'İptal edilen siparişlerin ürünleri stoğa geri eklenmiyor.',
     20, 20, 9, 2, 2, now() + interval '4 hours', NULL, now() - interval '4 hours', now() - interval '1 hour'),

    (43, 6, 21, 'Incident', 'Kargo takip numarası müşteriye iletilmiyor',
     'Kargo firması entegrasyonu takip kodunu dönüyor ama e-postaya eklenmiyor.',
     20, 20, 21, 2, 2, now() + interval '6 hours', NULL, now() - interval '8 hours', now() - interval '2 hours'),

    (44, 6, 22, 'Incident', 'Ürün fiyatları sepette farklı görünüyor',
     'Kampanyalı ürünlerde liste fiyatı ile sepet fiyatı uyuşmuyor.',
     10, 20, 20, NULL, 2, now() + interval '5 hours', NULL, now() - interval '3 hours', now() - interval '3 hours'),

    (45, 6, 23, 'ServiceRequest', 'Yılbaşı kampanyası kupon kuralı',
     '500 TL üzeri alışverişte %15 indirim kuponu tanımlanması gerekiyor.',
     10, 30, 17, NULL, 3, now() + interval '2 days', NULL, now() - interval '1 day', now() - interval '1 day'),

    (46, 6, 19, 'Incident', 'Havale/EFT bildirimleri geç düşüyor',
     'Ödeme bildirimi bankadan 2 saat gecikmeli geliyor.',
     30, 30, 16, 17, 3, now() + interval '3 days', NULL, now() - interval '5 days', now() - interval '2 days'),

    (47, 6, 20, 'Incident', 'İade talebi formu gönderilmiyor',
     'Form doğrulama hatası düzeltildi.',
     40, 20, 21, 2, 2, now() - interval '1 day', now() - interval '4 hours', now() - interval '2 days', now() - interval '4 hours'),

    (48, 6, 22, 'ServiceRequest', 'Ürün karşılaştırma özelliği',
     'Müşteriler benzer ürünleri yan yana görmek istiyor.',
     10, 40, 20, NULL, 4, now() + interval '6 days', NULL, now() - interval '6 days', now() - interval '6 days'),

    (49, 6, 21, 'Incident', 'Yanlış kargo ücreti hesaplanıyor',
     'Desi hesabı düzeltildi.',
     50, 30, 9, 2, 3, now() - interval '14 days', now() - interval '15 days', now() - interval '17 days', now() - interval '15 days'),

    (50, 6, 23, 'Incident', 'Kupon kodu birden fazla kez kullanılabiliyor',
     'Tek kullanımlık kupon kontrolü eklendi.',
     50, 10, 17, 17, 13, now() - interval '20 days', now() - interval '21 days', now() - interval '22 days', now() - interval '21 days'),

    -- =======================================================
    -- ÇAĞRI MERKEZİ (Proje 7)
    -- =======================================================
    -- Gecikmiş kritik: santral kesintisi
    (51, 7, 24, 'Incident', 'Santral arızası - gelen çağrılar düşüyor',
     'Müşteriler çağrı merkezine ulaşamıyor, tüm hatlar meşgul sinyali veriyor.',
     20, 10, 19, 6, 14, now() - interval '25 minutes', NULL, now() - interval '90 minutes', now() - interval '15 minutes'),

    (52, 7, 25, 'Incident', 'Çağrı geçmişi CRM''de görünmüyor',
     'Temsilciler müşterinin önceki çağrılarını göremiyor.',
     20, 20, 22, 16, 15, now() + interval '3 hours', NULL, now() - interval '5 hours', now() - interval '1 hour'),

    (53, 7, 26, 'ServiceRequest', 'IVR menüsüne yeni seçenek eklenmesi',
     'Teknik destek için ayrı bir menü seçeneği isteniyor.',
     10, 30, 19, 22, 3, now() + interval '1 day', NULL, now() - interval '10 hours', now() - interval '10 hours'),

    (54, 7, 24, 'Incident', 'Ses kalitesi düşük, çağrılarda cızırtı',
     'Özellikle öğle saatlerinde ses kalitesi bozuluyor.',
     30, 20, 4, 6, 15, now() + interval '2 days', NULL, now() - interval '4 days', now() - interval '2 days'),

    (55, 7, 26, 'Incident', 'Çağrılar yanlış kuyruğa yönleniyor',
     'Yönlendirme kuralı düzeltildi.',
     40, 20, 22, 16, 15, now() - interval '1 day', now() - interval '2 hours', now() - interval '3 days', now() - interval '2 hours'),

    (56, 7, 25, 'ServiceRequest', 'Çağrı kaydı arşiv süresi uzatılsın',
     'Yasal gereklilik nedeniyle 1 yıla çıkarıldı.',
     50, 40, 19, 16, 4, now() - interval '25 days', now() - interval '26 days', now() - interval '30 days', now() - interval '26 days'),

    -- =======================================================
    -- İK PORTALİ (Proje 5)
    -- =======================================================
    (57, 5, 15, 'Incident', 'İzin talebi onaya düşmüyor',
     'Çalışan izin talebi oluşturuyor ancak yöneticiye bildirim gitmiyor.',
     20, 20, 18, 15, 3, now() + interval '5 hours', NULL, now() - interval '6 hours', now() - interval '2 hours'),

    (58, 5, 16, 'Incident', 'Bordro PDF''i açılmıyor',
     'İndirilen bordro dosyası bozuk geliyor.',
     20, 20, 8, 15, 16, now() + interval '10 hours', NULL, now() - interval '6 hours', now() - interval '3 hours'),

    (59, 5, 17, 'ServiceRequest', 'Performans hedefi girişi açılsın',
     'Yıllık hedef girişi dönemi için modülün aktifleştirilmesi gerekiyor.',
     10, 30, 21, 15, 17, now() + interval '2 days', NULL, now() - interval '1 day', now() - interval '1 day'),

    (60, 5, 18, 'Incident', 'Yönetici başkasının bordrosunu görebiliyor',
     'Yetki kontrolünde eksik var, acil incelenmeli.',
     20, 10, 15, 15, 1, now() + interval '90 minutes', NULL, now() - interval '2 hours', now() - interval '30 minutes'),

    (61, 5, 15, 'Incident', 'İzin bakiyesi yanlış hesaplanıyor',
     'Devreden izin günleri eklenmiyor.',
     30, 30, 18, 15, 17, now() + interval '4 days', NULL, now() - interval '7 days', now() - interval '3 days'),

    (62, 5, 16, 'ServiceRequest', 'Geçmiş yıl bordrolarına erişim',
     'Arşiv erişimi açıldı.',
     40, 40, 8, 15, 4, now() - interval '2 days', now() - interval '6 hours', now() - interval '4 days', now() - interval '6 hours'),

    (63, 5, 17, 'Incident', 'Değerlendirme formu kaydedilmiyor',
     'Oturum zaman aşımı süresi uzatıldı.',
     50, 30, 21, 15, 3, now() - interval '16 days', now() - interval '17 days', now() - interval '19 days', now() - interval '17 days'),

    -- =======================================================
    -- ESKİ İNTRANET (Proje 8 - arşiv)
    -- =======================================================
    (64, 8, 27, 'Incident', 'Eski intranet dosyalarına erişim talebi',
     'Kapatılan portaldeki dokümanlara erişim gerekiyor. Arşivden çıkarıldı.',
     50, 40, 3, 3, 4, now() - interval '60 days', now() - interval '62 days', now() - interval '65 days', now() - interval '62 days'),

    -- =======================================================
    -- MONITORING PLATFORMU (Proje 9)
    -- =======================================================
    -- Gecikmiş kritik: alarm gelmiyor, en sıkı SLA (5dk/30dk)
    (65, 9, 28, 'Incident', 'Kritik alarmlar bildirim göndermiyor',
     'Son 2 saattir CPU ve disk alarmları tetikleniyor ancak nöbetçiye bildirim ulaşmıyor.',
     20, 10, 27, 27, 18, now() - interval '45 minutes', NULL, now() - interval '2 hours', now() - interval '30 minutes'),

    (66, 9, 30, 'Incident', 'Üç sunucuda izleme ajanı veri göndermiyor',
     'Ajanlar çalışıyor görünüyor ama metrik akışı 40 dakikadır durmuş durumda.',
     20, 20, 28, 27, 19, now() + interval '2 hours', NULL, now() - interval '3 hours', now() - interval '1 hour'),

    (67, 9, 29, 'Incident', 'Dashboard grafikleri boş geliyor',
     'Ana izleme panosundaki grafikler yükleniyor ancak veri göstermiyor.',
     10, 20, 23, NULL, 2, now() + interval '5 hours', NULL, now() - interval '4 hours', now() - interval '4 hours'),

    (68, 9, 28, 'Incident', 'Disk alarmı eşiği çok düşük, gereksiz alarm üretiyor',
     'Yedekleme sırasında geçici doluluk alarm tetikliyor, ekip alarm körlüğü yaşıyor.',
     20, 30, 3, 28, 3, now() + interval '18 hours', NULL, now() - interval '2 days', now() - interval '5 hours'),

    (69, 9, 31, 'ServiceRequest', 'Nöbet çizelgesine yeni ekip üyesi eklenmesi',
     'Ekibe katılan kişinin nöbet rotasyonuna ve çağrı zincirine eklenmesi gerekiyor.',
     10, 30, 28, 27, 3, now() + interval '2 days', NULL, now() - interval '1 day', now() - interval '1 day'),

    (70, 9, 29, 'ServiceRequest', 'Operatör bazlı SMS trafiği panosu',
     'SMS ekibi için operatör kırılımlı gönderim grafiği isteniyor.',
     10, 40, 29, NULL, 4, now() + interval '5 days', NULL, now() - interval '3 days', now() - interval '3 days'),

    (71, 9, 30, 'Incident', 'Ajan güncellemesi sonrası bellek tüketimi arttı',
     'Yeni sürüm bellek sızdırıyor, sunucular şişiyor.',
     30, 20, 27, 28, 19, now() + interval '1 day', NULL, now() - interval '4 days', now() - interval '2 days'),

    (72, 9, 28, 'Incident', 'Alarm e-postaları spam klasörüne düşüyor',
     'SPF kaydı düzeltildi, alarmlar gelen kutusuna düşüyor.',
     40, 20, 28, 27, 3, now() - interval '1 day', now() - interval '5 hours', now() - interval '3 days', now() - interval '5 hours'),

    (73, 9, 31, 'Incident', 'Eskalasyon zinciri ikinci seviyeye geçmiyor',
     'Zaman aşımı süresi yanlış tanımlanmıştı, düzeltildi.',
     50, 20, 27, 27, 3, now() - interval '12 days', now() - interval '13 days', now() - interval '15 days', now() - interval '13 days'),

    -- =======================================================
    -- SMS GATEWAY (Proje 10)
    -- =======================================================
    -- Gecikmiş kritik: operatör bağlantısı kopuk
    (74, 10, 33, 'Incident', 'Operatör bağlantısı koptu, mesajlar iletilemiyor',
     'Ana operatör bağlantısı 35 dakikadır kapalı. Kuyrukta bekleyen mesaj sayısı hızla artıyor.',
     20, 10, 29, 29, 22, now() - interval '20 minutes', NULL, now() - interval '55 minutes', now() - interval '10 minutes'),

    (75, 10, 34, 'Incident', 'Gönderim kuyruğunda ciddi birikme var',
     'Kuyrukta 40 binden fazla mesaj bekliyor, ortalama gecikme 8 dakikaya çıktı.',
     20, 10, 30, 29, 20, now() + interval '30 minutes', NULL, now() - interval '1 hour', now() - interval '15 minutes'),

    (76, 10, 32, 'Incident', 'Bazı numaralara mesaj gitmiyor - hata kodu 404',
     'Belirli bir numara aralığında gönderimler kalıcı hata dönüyor.',
     20, 20, 25, 30, 23, now() + interval '3 hours', NULL, now() - interval '4 hours', now() - interval '1 hour'),

    (77, 10, 35, 'Incident', 'Teslim raporları eksik geliyor',
     'Gönderilen mesajların yalnızca yarısı için teslim raporu düşüyor.',
     10, 20, 26, NULL, 23, now() + interval '4 hours', NULL, now() - interval '2 hours', now() - interval '2 hours'),

    (78, 10, 33, 'ServiceRequest', 'Yedek operatör entegrasyonu talebi',
     'Ana operatör kesintilerinde devreye girecek yedek hat entegrasyonu isteniyor.',
     10, 30, 25, 29, 3, now() + interval '3 days', NULL, now() - interval '2 days', now() - interval '2 days'),

    (79, 10, 34, 'Incident', 'Yoğun saatlerde gönderim hızı düşüyor',
     'Akşam 18:00-20:00 arası throughput yarıya iniyor.',
     30, 30, 30, 29, 3, now() + interval '2 days', NULL, now() - interval '6 days', now() - interval '3 days'),

    (80, 10, 35, 'ServiceRequest', 'Aylık gönderim raporu otomasyonu',
     'Rapor her ayın 1''inde otomatik e-posta olarak gönderilecek şekilde ayarlandı.',
     40, 40, 26, 30, 4, now() - interval '2 days', now() - interval '3 hours', now() - interval '5 days', now() - interval '3 hours'),

    (81, 10, 32, 'Incident', 'Türkçe karakterli mesajlar bozuk gidiyor',
     'Karakter kodlaması UCS-2 olarak düzeltildi.',
     40, 20, 25, 30, 23, now() - interval '1 day', now() - interval '6 hours', now() - interval '2 days', now() - interval '6 hours'),

    (82, 10, 32, 'Incident', 'Aynı mesaj müşteriye iki kez gidiyor',
     'Yeniden deneme mantığındaki mükerrer gönderim hatası giderildi.',
     50, 10, 29, 29, 21, now() - interval '18 days', now() - interval '19 days', now() - interval '20 days', now() - interval '19 days'),

    (83, 10, 34, 'Incident', 'Kuyruk servisi gece yeniden başladı',
     'Bellek limiti artırıldı, servis stabil.',
     50, 20, 30, 29, 23, now() - interval '26 days', now() - interval '27 days', now() - interval '29 days', now() - interval '27 days');

SELECT setval(pg_get_serial_sequence('"Tickets"', 'Id'), 83);

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
    (35, 8, 'Bugün üçüncü kez giriş yapmak zorunda kaldım.',                    false, now() - interval '3 hours'),

    -- E-Ticaret
    (41, 17, 'Ödeme sağlayıcısıyla görüşüyorum, sanal POS tarafında sorun var.', false, now() - interval '40 minutes'),
    (41, 2,  'Geçici olarak havale/EFT seçeneğini öne çıkaralım mı?',            false, now() - interval '30 minutes'),
    (41, 17, 'Sağlayıcı sertifika yenilemesini atlamış - dönüş bekliyoruz.',     true,  now() - interval '20 minutes'),
    (42, 9,  'Stok farkı şu an 12 ürün, elle düzeltiyoruz.',                     false, now() - interval '3 hours'),
    (44, 20, 'Kampanya başlangıcından beri şikayet geliyor.',                    false, now() - interval '2 hours'),
    (47, 21, 'Confirmed the fix on staging, looks good.',                        false, now() - interval '5 hours'),

    -- Çağrı Merkezi
    (51, 19, 'Müşteri şikayetleri sosyal medyaya taşınmaya başladı.',            false, now() - interval '70 minutes'),
    (51, 6,  'Santral yeniden başlatıldı, hatlar tek tek açılıyor.',             false, now() - interval '30 minutes'),
    (51, 6,  'Not: UPS kaynaklı güç dalgalanması şüphesi var.',                  true,  now() - interval '25 minutes'),
    (52, 22, 'Temsilciler müşteriyi tanıyamadığı için çağrılar uzuyor.',         false, now() - interval '4 hours'),
    (54, 4,  'Öğle saatlerinde bant genişliği doluyor olabilir.',                false, now() - interval '3 days'),

    -- İK Portali
    (57, 18, 'Üç haftadır izin onayları elle takip ediliyor.',                   false, now() - interval '5 hours'),
    (57, 15, 'Bildirim servisi kuyruğu tıkanmış, temizledim.',                   false, now() - interval '2 hours'),
    (60, 15, 'Yetki kontrolü acilen kapatıldı, kalıcı düzeltme geliyor.',        true,  now() - interval '1 hour'),
    (61, 18, 'Geçen yıldan devreden 5 gün görünmüyor.',                          false, now() - interval '6 days'),

    -- Monitoring Platformu
    (65, 27, 'Alarm kuralları tetikleniyor, sorun bildirim kanalında.',          false, now() - interval '100 minutes'),
    (65, 28, 'Webhook ucu 500 dönüyor, sağlayıcı tarafına bakıyorum.',           false, now() - interval '60 minutes'),
    (65, 27, 'Not: nöbetçiye geçici olarak SMS ile haber veriyoruz.',            true,  now() - interval '50 minutes'),
    (66, 28, 'Etkilenen sunucular: app-03, app-07, db-02.',                      false, now() - interval '2 hours'),
    (68, 3,  'Gereksiz alarmlar yüzünden gerçek alarmı kaçırma riski var.',      false, now() - interval '1 day'),
    (68, 28, 'Eşiği %85''e çekip yedekleme penceresini hariç tutacağım.',        false, now() - interval '5 hours'),
    (71, 27, 'Ajanı bir önceki sürüme döndürelim mi?',                           false, now() - interval '3 days'),

    -- SMS Gateway
    (74, 29, 'Operatörle görüşüldü, kendi taraflarında bakım varmış.',           false, now() - interval '40 minutes'),
    (74, 30, 'Kuyruk şişmesin diye gönderim hızını geçici olarak düşürdüm.',     false, now() - interval '25 minutes'),
    (74, 29, 'Not: yedek operatör entegrasyonu olsaydı kesinti yaşanmayacaktı.', true,  now() - interval '15 minutes'),
    (75, 30, 'Kuyruk 40 bini geçti, tüketici sayısını artırıyorum.',             false, now() - interval '45 minutes'),
    (76, 25, 'Sorunlu numaralar hep aynı operatöre ait görünüyor.',              false, now() - interval '3 hours'),
    (78, 25, 'Bugünkü kesinti yedek hat ihtiyacını net gösterdi.',               false, now() - interval '1 day'),
    (81, 30, 'GSM 03.38 yerine UCS-2 kullanmamız gerekiyordu.',                  true,  now() - interval '1 day');

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
    (33, NULL, 3, 1, NULL,                                            now() - interval '3 hours'),

    -- Yeni projeler
    (41, NULL, 17, 1, 'Otomatik atama kuralına göre atandı.',          now() - interval '1 hour'),
    (42, NULL, 2,  17, 'Stok tarafı yazılım ekibinde.',                now() - interval '3 hours'),
    -- Devir örneği: önce Emre''ye atanmış, sonra Gizem''e devredilmiş
    (43, NULL, 16, 1, 'Otomatik atama kuralına göre atandı.',          now() - interval '8 hours'),
    (43, 16,   2,  17, 'Kargo entegrasyonu yazılım ekibine devredildi.', now() - interval '2 hours'),
    (51, NULL, 6,  1, 'Otomatik atama kuralına göre atandı.',          now() - interval '85 minutes'),
    (52, NULL, 16, 19, NULL,                                          now() - interval '4 hours'),
    (57, NULL, 15, 1, 'Otomatik atama kuralına göre atandı.',          now() - interval '5 hours'),
    (60, NULL, 15, 1, 'Güvenlik konusu, doğrudan proje sorumlusuna.',  now() - interval '90 minutes'),

    -- Monitoring / SMS
    (65, NULL, 27, 1,  'Otomatik atama kuralına göre atandı.',         now() - interval '115 minutes'),
    (66, NULL, 27, 27, NULL,                                           now() - interval '2 hours'),
    -- Devir örneği: nöbet değişiminde talep diğer ekip üyesine geçmiş
    (68, NULL, 27, 1,  'Otomatik atama kuralına göre atandı.',         now() - interval '2 days'),
    (68, 27,   28, 27, 'Nöbet değişimi nedeniyle devredildi.',         now() - interval '5 hours'),
    (71, NULL, 28, 27, NULL,                                           now() - interval '3 days'),
    (74, NULL, 29, 1,  'Otomatik atama kuralına göre atandı.',         now() - interval '50 minutes'),
    (75, NULL, 29, 29, NULL,                                           now() - interval '50 minutes'),
    (76, NULL, 30, 29, 'Operatör bazlı inceleme gerekiyor.',           now() - interval '3 hours'),
    (80, NULL, 30, 29, NULL,                                           now() - interval '4 days');

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
    (24, 40, 50, 1, now() - interval '18 days'),

    -- Yeni projeler
    (41, 10, 20, 17, now() - interval '45 minutes'),
    (42, 10, 20, 2,  now() - interval '2 hours'),
    (43, 10, 20, 2,  now() - interval '2 hours'),
    (46, 10, 20, 17, now() - interval '4 days'),
    (46, 20, 30, 17, now() - interval '2 days'),
    (47, 10, 20, 2,  now() - interval '1 day'),
    (47, 20, 40, 2,  now() - interval '4 hours'),
    (50, 10, 40, 17, now() - interval '21 days'),
    (50, 40, 50, 1,  now() - interval '21 days'),
    (51, 10, 20, 6,  now() - interval '60 minutes'),
    (52, 10, 20, 16, now() - interval '3 hours'),
    (54, 10, 20, 6,  now() - interval '3 days'),
    (54, 20, 30, 6,  now() - interval '2 days'),
    (55, 10, 20, 16, now() - interval '2 days'),
    (55, 20, 40, 16, now() - interval '2 hours'),
    (57, 10, 20, 15, now() - interval '4 hours'),
    (58, 10, 20, 15, now() - interval '4 hours'),
    (60, 10, 20, 15, now() - interval '80 minutes'),
    (61, 10, 20, 15, now() - interval '5 days'),
    (61, 20, 30, 15, now() - interval '3 days'),
    (62, 10, 40, 15, now() - interval '6 hours'),
    (63, 10, 40, 15, now() - interval '17 days'),
    (63, 40, 50, 1,  now() - interval '17 days'),

    -- Monitoring / SMS
    (65, 10, 20, 27, now() - interval '100 minutes'),
    (66, 10, 20, 27, now() - interval '2 hours'),
    (68, 10, 20, 28, now() - interval '5 hours'),
    (71, 10, 20, 28, now() - interval '3 days'),
    (71, 20, 30, 27, now() - interval '2 days'),
    (72, 10, 20, 27, now() - interval '2 days'),
    (72, 20, 40, 27, now() - interval '5 hours'),
    (73, 10, 40, 27, now() - interval '13 days'),
    (73, 40, 50, 1,  now() - interval '13 days'),
    (74, 10, 20, 29, now() - interval '40 minutes'),
    (75, 10, 20, 29, now() - interval '45 minutes'),
    (76, 10, 20, 30, now() - interval '2 hours'),
    (79, 10, 20, 29, now() - interval '5 days'),
    (79, 20, 30, 29, now() - interval '3 days'),
    (80, 10, 40, 30, now() - interval '3 hours'),
    (81, 10, 40, 30, now() - interval '6 hours'),
    (82, 10, 40, 29, now() - interval '19 days'),
    (82, 40, 50, 1,  now() - interval '19 days'),
    (83, 10, 40, 29, now() - interval '27 days'),
    (83, 40, 50, 1,  now() - interval '27 days');

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
     true, 1, now() - interval '70 days', now() - interval '70 days'),

    (6, 19, 'Ödeme reddedilme kodları ve anlamları',
     E'05 - Banka reddetti (limit/bakiye)\n51 - Yetersiz bakiye\n54 - Kartın son kullanma tarihi geçmiş\n91 - Banka sistemi yanıt vermiyor\n\n91 kodu yoğun geliyorsa sorun bizde değil, sağlayıcı tarafındadır; önce durum sayfasını kontrol edin.',
     true, 17, now() - interval '35 days', now() - interval '12 days'),

    (6, 21, 'Kargo entegrasyonu test ortamı bilgileri',
     E'Test ortamında gerçek kargo çağrısı yapılmaz, sahte takip kodu döner.\n\nTakip kodu formatı: TEST-XXXXXXXX\nEntegrasyon logları: /var/log/shop/cargo/\n\nCanlıya geçmeden önce mutlaka gerçek hesapla bir gönderi oluşturun.',
     true, 2, now() - interval '28 days', now() - interval '28 days'),

    (7, 24, 'Santral arızasında ilk müdahale adımları',
     E'1. Santral yönetim arayüzünden hat durumlarını kontrol edin.\n2. UPS ve güç kaynağı üzerinde alarm var mı bakın.\n3. Gerekirse santrali kontrollü şekilde yeniden başlatın.\n4. Çağrı merkezi yöneticisini mutlaka bilgilendirin.\n\nKesinti 15 dakikayı aşarsa çağrılar yedek hatta yönlendirilmelidir.',
     true, 6, now() - interval '22 days', now() - interval '8 days'),

    (5, 15, 'İzin talebi onay akışı nasıl işler?',
     E'1. Çalışan portal üzerinden talebi oluşturur.\n2. Talep doğrudan yöneticisine düşer.\n3. Yönetici onayladıktan sonra İK''ya bilgi gider.\n4. Onaylanan izin bakiyeden otomatik düşülür.\n\nOnay bildirimi gelmiyorsa bildirim servisi kuyruğu kontrol edilmelidir.',
     true, 15, now() - interval '18 days', now() - interval '18 days'),

    -- İkinci taslak makale: farklı projede de yayınlanmamış içerik olabildiğini gösterir
    (6, 23, 'Kampanya kurgusu kontrol listesi (taslak)',
     E'Bu doküman hazırlanma aşamasında.\n\nEklenecek başlıklar: kupon çakışma kuralları, stok rezervasyonu, kampanya bitiş senaryoları.',
     false, 17, now() - interval '4 days', now() - interval '1 day'),

    (9, 28, 'Alarm önceliklendirme ve eşik belirleme rehberi',
     E'Kritik: servis tamamen durmuş, müşteri etkilenmiş\nYüksek: servis çalışıyor ama bozulma var, kısa sürede kritiğe döner\nOrta: tek sunucu/bileşen, yedeği devrede\nDüşük: bilgilendirme, kapasite planlaması\n\nEşik belirlerken yedekleme ve toplu iş pencerelerini hariç tutun; aksi halde düzenli olarak yanlış alarm üretir ve ekip alarm körlüğü yaşar.',
     true, 27, now() - interval '40 days', now() - interval '6 days'),

    (9, 31, 'Nöbet devri sırasında yapılacaklar',
     E'1. Açık kritik ve yüksek öncelikli talepleri devralan kişiyle birlikte gözden geçirin.\n2. Devam eden müdahaleleri talep yorumlarına yazın (sözlü aktarım yeterli değildir).\n3. Bekleyen eskalasyonları ve üçüncü taraf beklemelerini belirtin.\n4. Nöbet çizelgesinde devrin göründüğünü doğrulayın.',
     true, 27, now() - interval '33 days', now() - interval '33 days'),

    (10, 32, 'SMS gönderim hata kodları',
     E'404 - Numara operatörde tanımlı değil\n408 - Operatör zaman aşımı, yeniden denenebilir\n429 - Hız limiti aşıldı, kuyruk hızını düşürün\n500 - Operatör tarafı hata\n\n408 ve 429 geçici hatalardır ve otomatik yeniden denemeye girer; 404 kalıcıdır, tekrar denenmemelidir.',
     true, 29, now() - interval '36 days', now() - interval '9 days'),

    (10, 34, 'Kuyruk birikmesinde ilk müdahale',
     E'1. Operatör bağlantı durumunu kontrol edin (çoğu birikmenin kökeni budur).\n2. Tüketici (consumer) sayısını ve işlem hızını inceleyin.\n3. Gerekirse geçici olarak gönderim hızını düşürüp kuyruğun erimesini bekleyin.\n4. 10 dakikadan uzun süren birikmelerde ilgili ekipleri bilgilendirin.',
     true, 30, now() - interval '29 days', now() - interval '29 days'),

    (10, 33, 'Türkçe karakter ve mesaj uzunluğu',
     E'GSM 03.38 alfabesi Türkçe karakterlerin tamamını içermez; ş, ğ, İ, ı gibi karakterler bozulur.\n\nTürkçe karakter içeren mesajlarda UCS-2 kodlaması kullanılmalıdır. UCS-2''de tek parça mesaj 70 karakterdir (GSM 03.38''de 160), bu da mesajın birden fazla parçaya bölünmesine ve maliyetin artmasına yol açar.',
     true, 29, now() - interval '21 days', now() - interval '21 days');

COMMIT;

-- ==========================================================
-- ÖZET
-- ==========================================================
-- 30 kullanıcı (1 pasif, 2 İngilizce tercihli), 9 grup, 10 proje
-- (1'i arşivlenmiş), 35 kategori, 83 talep, 23 SLA tanımı (4 katmanın
-- tamamı), 17 otomatik atama kuralı, 47 yorum, 18 bilgi bankası makalesi.
--
-- Gruplar arasında staj yapılan birimin gerçek ekipleri de yer alıyor:
-- Ice Age, Jetgiller, Monitoring ve SMS. Monitoring ve SMS ekiplerinin
-- kendi projeleri (Monitoring Platformu, SMS Gateway) alan diline uygun
-- kategori, SLA ve taleplerle kurgulandı.
--
-- Tüm şifreler: 12345
-- Admin girişi:  admin@itsm.local
--
-- Notification, SlaBreach ve AuditLog kayıtları bilinçli olarak
-- eklenmedi: bunlar uygulama çalışırken doğal olarak oluşmalı.
-- SLA'sı aşmış talepler (1, 2, 3) arka plan servisi çalıştığında
-- ihlal kaydı ve bildirim üretecek - sunumda bu akış canlı izlenebilir.
-- ==========================================================

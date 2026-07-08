-- ITSM Tool - Seed / Reference Data (DML)
-- Bu script, uygulamanın çalışabilmesi için gereken minimum sözlük verisini ekler.
-- 001_initial_schema.sql çalıştırıldıktan SONRA çalıştırılmalıdır.

-- ==========================================================
-- Statüler (sort_order iş akışı sırasını belirler)
-- ==========================================================
INSERT INTO statuses (name, sort_order) VALUES
    ('Açık',         10),
    ('Devam Ediyor', 20),
    ('Beklemede',    30),
    ('Çözüldü',      40),
    ('Kapatıldı',    50);

-- ==========================================================
-- Öncelikler (sort_order önem sırasını belirler)
-- ==========================================================
INSERT INTO priorities (name, sort_order) VALUES
    ('Kritik', 10),
    ('Yüksek', 20),
    ('Orta',   30),
    ('Düşük',  40);

-- ==========================================================
-- Yetki kataloğu (permissions) - kod tarafında [RequirePermission("...")] ile eşleşecek
-- ==========================================================
INSERT INTO permissions (code, name, description) VALUES
    ('TICKET_CREATE',   'Talep Oluşturma',        'Yeni talep/incident açabilir'),
    ('TICKET_APPROVE',  'Talep Onaylama',         'Service request onayı verebilir'),
    ('TICKET_ASSIGN',   'Talep Atama',            'Talebi bir kullanıcıya/gruba atayabilir'),
    ('TICKET_TRANSFER', 'Talep Transfer',         'Talebin sahibini değiştirebilir'),
    ('TICKET_CLOSE',    'Talep Kapatma',          'Talebi kapatabilir'),
    ('REPORT_VIEW',     'Rapor Görüntüleme',      'Dashboard ve raporları görebilir'),
    ('KB_MANAGE',       'Bilgi Bankası Yönetimi', 'Knowledge base makalesi ekleyip düzenleyebilir'),
    ('ADMIN_MANAGE',    'Admin İşlemleri',        'Grup, kullanıcı, yetki, proje yönetimi yapabilir');

-- ==========================================================
-- İş birimleri (groups) - dokümandaki örnek gruplar
-- ==========================================================
INSERT INTO groups (name, description) VALUES
    ('Yazılım Geliştirme',    'Uygulama geliştirme ekibi'),
    ('Sistem & Network',      'Sistem yönetimi ve network operasyonları'),
    ('Destek Birimi',         'Birinci seviye destek / help desk'),
    ('Veritabanı Yönetimi',   'DB yönetimi ve bakım ekibi');

-- Not: örnek projeler, kategoriler ve kullanıcılar bilinçli olarak eklenmedi.
-- Bunlar admin panel üzerinden veya ayrı bir "demo data" scriptiyle eklenmeli,
-- çünkü şifre hash'i, gerçek proje isimleri gibi ortam-özel veriler içeriyor.

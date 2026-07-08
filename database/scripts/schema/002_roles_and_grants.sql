-- ITSM Tool - Database Roles & Grants (DCL)
-- Amaç: Uygulamanın (.NET backend) postgres superuser yerine, yalnızca ihtiyacı olan
-- yetkilere sahip kısıtlı bir rol ile bağlanmasını sağlamak.
-- Bu script bir kez, veritabanı kurulum aşamasında (DBeaver veya psql ile) çalıştırılır.

-- ==========================================================
-- 1. Uygulama rolü oluştur
-- ==========================================================
-- Şifreyi burada düz yazmayın; gerçek ortamda değişken/secret olarak yönetin.
CREATE ROLE itsm_app WITH LOGIN PASSWORD 'CHANGE_ME_IN_ENV';

-- ==========================================================
-- 2. Şema erişimi
-- ==========================================================
GRANT USAGE ON SCHEMA public TO itsm_app;

-- ==========================================================
-- 3. Mevcut tablolar üzerinde CRUD yetkisi
-- ==========================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO itsm_app;

-- Sequence'lar üzerinde de yetki gerekiyor (BIGSERIAL kolonlar nextval() kullanıyor)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO itsm_app;

-- ==========================================================
-- 4. Bundan sonra eklenecek yeni tablo/sequence'lar için de otomatik yetki
--    (yeni migration ile tablo eklendiğinde tekrar GRANT yazmaya gerek kalmasın diye)
-- ==========================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO itsm_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO itsm_app;

-- ==========================================================
-- 5. Ne YAPMAMASI gerektiği (bilinçli olarak verilmeyen yetkiler)
-- ==========================================================
-- itsm_app rolüne CREATEDB, CREATEROLE, SUPERUSER verilmiyor.
-- Migration'lar (DDL: CREATE TABLE, ALTER TABLE) ayrı, daha yetkili bir
-- "migrator" rolüyle (ör. CI/CD pipeline'da kullanılan) çalıştırılmalı;
-- uygulamanın runtime rolü sadece veri okuma/yazma yapmalı, şema değiştirmemeli.

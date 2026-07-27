-- ITSM Tool - Initial Schema
-- PostgreSQL

-- ==========================================================
-- 1. Kullanıcı & Yetkilendirme
-- ==========================================================

CREATE TABLE groups (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    group_id      BIGINT NOT NULL REFERENCES groups(id),
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_group_id ON users(group_id);

CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(100) NOT NULL UNIQUE,   -- ör. TICKET_CREATE, TICKET_ASSIGN, ADMIN_MANAGE
    name        VARCHAR(150) NOT NULL,
    description TEXT
);

-- ==========================================================
-- 2. Proje Yapısı
-- ==========================================================

CREATE TABLE projects (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    code        VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_members (
    id         BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- user_permissions: projects tablosuna bağımlı olduğu için burada tanımlanıyor
CREATE TABLE user_permissions (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    project_id    BIGINT REFERENCES projects(id) ON DELETE CASCADE,  -- NULL = tüm projelerde geçerli
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, permission_id, project_id)
);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    description TEXT
);
CREATE INDEX idx_categories_project_id ON categories(project_id);

-- ==========================================================
-- 3. Lookup Tablolar
-- ==========================================================

CREATE TABLE statuses (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,   -- Açık, Devam Ediyor, Beklemede, Çözüldü, Kapatıldı
    sort_order INT NOT NULL
);

CREATE TABLE priorities (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,   -- Kritik, Yüksek, Orta, Düşük
    sort_order INT NOT NULL
);

-- ==========================================================
-- 4. SLA
-- ==========================================================

CREATE TABLE slas (
    id                     BIGSERIAL PRIMARY KEY,
    project_id             BIGINT REFERENCES projects(id) ON DELETE CASCADE,   -- NULL = genel kural
    category_id            BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    priority_id            BIGINT NOT NULL REFERENCES priorities(id),
    response_time_minutes  INT NOT NULL,
    resolution_time_minutes INT NOT NULL,
    UNIQUE (project_id, category_id, priority_id)
);

-- ==========================================================
-- 5. Talep (Ticket) Çekirdeği
-- ==========================================================

CREATE TABLE tickets (
    id           BIGSERIAL PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id),
    category_id  BIGINT NOT NULL REFERENCES categories(id),
    ticket_type  VARCHAR(20) NOT NULL CHECK (ticket_type IN ('incident', 'service_request')),
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    status_id    BIGINT NOT NULL REFERENCES statuses(id),
    priority_id  BIGINT NOT NULL REFERENCES priorities(id),
    created_by   BIGINT NOT NULL REFERENCES users(id),
    assigned_to  BIGINT REFERENCES users(id),
    sla_id       BIGINT REFERENCES slas(id),
    due_at       TIMESTAMPTZ,
    resolved_at  TIMESTAMPTZ,
    closed_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_project_id ON tickets(project_id);
CREATE INDEX idx_tickets_status_id ON tickets(status_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);

CREATE TABLE ticket_status_history (
    id             BIGSERIAL PRIMARY KEY,
    ticket_id      BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    old_status_id  BIGINT REFERENCES statuses(id),
    new_status_id  BIGINT NOT NULL REFERENCES statuses(id),
    changed_by     BIGINT NOT NULL REFERENCES users(id),
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_status_history_ticket_id ON ticket_status_history(ticket_id);

CREATE TABLE ticket_assignments (
    id            BIGSERIAL PRIMARY KEY,
    ticket_id     BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    assigned_from BIGINT REFERENCES users(id),
    assigned_to   BIGINT NOT NULL REFERENCES users(id),
    assigned_by   BIGINT NOT NULL REFERENCES users(id),
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    note          TEXT
);
CREATE INDEX idx_ticket_assignments_ticket_id ON ticket_assignments(ticket_id);

CREATE TABLE sla_breaches (
    id          BIGSERIAL PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    breach_type VARCHAR(20) NOT NULL CHECK (breach_type IN ('response', 'resolution')),
    breached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_sla_breaches_ticket_id ON sla_breaches(ticket_id);

-- ==========================================================
-- 6. İletişim & Ek Dosya
-- ==========================================================

CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    message     TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);

CREATE TABLE attachments (
    id          BIGSERIAL PRIMARY KEY,
    ticket_id   BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    file_name   VARCHAR(255) NOT NULL,
    file_path   VARCHAR(500) NOT NULL,
    uploaded_by BIGINT NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ticket_id IS NOT NULL OR comment_id IS NOT NULL)
);
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX idx_attachments_comment_id ON attachments(comment_id);

-- ==========================================================
-- 7. Bildirim & Audit
-- ==========================================================

CREATE TABLE notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id  BIGINT REFERENCES tickets(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    entity_name VARCHAR(100) NOT NULL,
    entity_id   BIGINT NOT NULL,
    action      VARCHAR(50) NOT NULL,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);

-- ==========================================================
-- 8. Bilgi Bankası & Otomatik Atama (bonus)
-- ==========================================================

CREATE TABLE knowledge_base_articles (
    id           BIGSERIAL PRIMARY KEY,
    project_id   BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    category_id  BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    content      TEXT NOT NULL,
    created_by   BIGINT NOT NULL REFERENCES users(id),
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auto_assignment_rules (
    id                 BIGSERIAL PRIMARY KEY,
    project_id         BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id        BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    assign_to_user_id  BIGINT REFERENCES users(id),
    assign_to_group_id BIGINT REFERENCES groups(id),
    priority_order     INT NOT NULL DEFAULT 0,
    CHECK (assign_to_user_id IS NOT NULL OR assign_to_group_id IS NOT NULL)
);

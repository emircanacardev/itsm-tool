# CLAUDE.md

ITSM (IT Service Management) tool — a ticket/incident management backend built as a Turkcell internship project. .NET 10 Web API following Clean Architecture, PostgreSQL via EF Core, JWT auth with fine-grained permission-based authorization.

Codebase language note: user-facing/domain strings and some comments are in Turkish (e.g. status name `"Açık"`). Keep that convention; write new code comments in the same style as the surrounding file.

**Source of truth for scope:** `docs/proje-gereksinimleri.md` (the internship brief, summarized) and
`docs/gelistirme-plani.md` (the 10-day sprint plan, kept up to date with ✅/🔄/⬜ status per item).
Read both before proposing scope changes.

## Layout

```
backend/
  ITSM.slnx                     # solution (new slnx format)
  src/
    ITSM.Domain/                # entities + enums. No dependencies.
    ITSM.Application/           # DTOs, service classes, repository interfaces. Depends on Domain.
    ITSM.Infrastructure/        # EF Core DbContext, migrations, repo impls, security, auth handlers. Depends on Application.
    ITSM.API/                   # controllers, Program.cs (DI + pipeline). Depends on Application + Infrastructure.
    ITSM.Shared/                # cross-cutting helpers (currently minimal)
  tests/ITSM.UnitTests/         # xUnit test project (scaffold only so far)
database/
  scripts/schema/               # raw SQL DDL + roles/grants
  scripts/seed/                 # seed reference data
  er-diagrams/schema-plan.md    # authoritative 20-table schema plan (Turkish) — read this for the data model
```

Dependency direction is strict: Domain ← Application ← Infrastructure ← API. Never make Domain or Application reference Infrastructure. Repositories are defined as interfaces in `Application/Interfaces` and implemented in `Infrastructure/Persistence/Repositories`.

## Commands

Run from `backend/`:

```bash
dotnet build                                    # build whole solution
dotnet run --project src/ITSM.API               # run the API
dotnet test                                     # run unit tests

# EF Core migrations (Infrastructure holds migrations, API is the startup project):
dotnet ef migrations add <Name> --project src/ITSM.Infrastructure --startup-project src/ITSM.API
dotnet ef database update --project src/ITSM.Infrastructure --startup-project src/ITSM.API
```

.NET 10 SDK. `dotnet ef` requires the EF tools (`dotnet tool install --global dotnet-ef`).

## Configuration & secrets

- The DB connection string and `Jwt:Key` are **secrets** — never commit them. `appsettings.json` intentionally leaves `ConnectionStrings:DefaultConnection` empty and omits `Jwt:Key`.
- Local secrets are stored via .NET user-secrets (UserSecretsId is in `ITSM.API.csproj`):
  ```bash
  dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<...>" --project src/ITSM.API
  dotnet user-secrets set "Jwt:Key" "<...>" --project src/ITSM.API
  ```
- DB is PostgreSQL (Npgsql provider).

## Architecture conventions

**Vertical slice per feature.** A typical endpoint touches, in order: Domain entity → EF configuration + migration → Application DTO(s) → repository interface → service class → Infrastructure repository impl → API controller action → DI registration in `Program.cs`. See the `add-feature-slice` skill.

**Services** are plain classes (not interfaces) registered `AddScoped<TicketService>()`. They orchestrate; they depend on repository *interfaces*, never on `AppDbContext` directly. Services own DTO↔entity mapping via private `static MapToResponse(...)` helpers.

**Repositories** wrap `AppDbContext`, call `SaveChangesAsync` themselves, and use `.Include(...)` for navigation properties that DTO mapping needs (e.g. `Status`, `Priority`).

**EF configuration** uses Fluent API via `IEntityTypeConfiguration<T>` classes in `Infrastructure/Persistence/Configurations`, auto-applied by `ApplyConfigurationsFromAssembly` in `AppDbContext`. Add a config class per new entity; don't configure inline in `OnModelCreating`.

**Entities** use `required` for non-nullable columns and non-nullable navs initialized to `null!`. PKs are `long` (BIGSERIAL). Timestamps are `DateTimeOffset` (TIMESTAMPTZ), defaulted to `DateTimeOffset.UtcNow` where appropriate.

**Controllers** are thin: extract the user id from the JWT (`User.FindFirst("sub")?.Value` → `long.Parse`), call the service, map result to `Ok`/`NotFound`/`NoContent`/`Conflict`. `[ApiController]` + `[Route("api/[controller]")]`. Inbound-claims mapping is disabled (`DefaultMapInboundClaims = false`) so the raw `sub` claim is available.

## Authentication & authorization

- JWT bearer auth. Tokens carry `sub` (user id), `email`, `name`. Issued by `JwtTokenGenerator`, HMAC-SHA256, config-driven issuer/audience/expiry.
- **Permission model is per-user, not role-based.** `permissions` is a catalog (codes like `TICKET_CREATE`, `TICKET_ASSIGN`, `REPORT_VIEW`); `user_permissions` grants a permission to a user, optionally scoped to a `project_id` (null = global). Two users in the same group can have different permissions.
- Enforcement: a policy per permission code registered in `Program.cs` (`options.AddPolicy("TICKET_CREATE", ...)`), backed by `PermissionRequirement` + `PermissionAuthorizationHandler`, which checks `IUserPermissionRepository.HasPermissionAsync`. Protect an action with `[Authorize(Policy = "TICKET_CREATE")]`.
- When you add a new permission code, register a matching policy in `Program.cs` or the `[Authorize(Policy=...)]` will fail.

## Claude ile Çalışma Kuralı (AI Kullanımı — brief §4.4)

**Claude, feature/domain kodunu (entity, DTO, repository, service, controller, migration içeriği vb.)
kendisi dosyaya yazmaz/Edit etmez.** Kodu chat'e satır satır açıklamayla birlikte verir, kullanıcı
kendi eliyle dosyaya yazar. Bu, brief'in "her satırı anlatabilmelisin, AI yazdı bilmiyorum kabul
edilemez" kuralının doğal sonucu (bkz. `docs/proje-gereksinimleri.md` §4.4).

İstisna: docs/plan dosyaları (`CLAUDE.md`, `docs/*.md`), config/DI wiring gibi triviyal tek satırlık
bağlantı kodları (ör. `Program.cs`'e `AddScoped<X>()` eklemek), ve kullanıcının "sen yaz" diye açıkça
izin verdiği durumlar. Şüphede kalınca chat'e yaz, dosyaya dokunma.

## Git İş Akışı ve Commit Kuralları

- **Branch stratejisi: feature-per-branch.** Her feature `develop`'tan açılan kendi branch'inde
  yapılır (`feature/<isim>`, ör. `feature/project-category-management`). Feature bitip test
  edilince PR ile `develop`'a merge edilir, branch silinir. `master`'a sadece belirli kilometre
  taşlarında `develop`'tan merge yapılır.
- **Commit ve push SADECE kullanıcı (Emircan) tarafından atılır. Claude hiçbir zaman `git commit`
  ya da `git push` çalıştırmaz — bu kesin bir kural, istisnası yok.**
- Claude; `git add`, `git status`, `git diff`, `git log`, branch açma (`git checkout -b ...`) gibi
  komutları kullanıcı adına önerebilir/çalıştırabilir. Ama commit/push işlemini asla kendisi
  yapmaz, bunu her zaman kullanıcı kendi eliyle yapar.
- **Her feature ayrı bir commit ile kapatılır** (brief §4.1 — küçük ve sık commit kuralı, bkz.
  `docs/proje-gereksinimleri.md`). Bir feature'ı ikiye bölüp de commit atmak (yarım/tutarsız state)
  doğru değildir; feature tamamlanıp test edilince commit atılır.
- Claude, bir feature'ın commit edilmesi gereken bir noktaya geldiğini fark ettiğinde (feature
  bitti, test edildi, çalışıyor) kullanıcıyı proaktif olarak uyarmalı — "şimdi commit atmalıyız"
  diyip commit mesajını hazırlamalıdır. Kullanıcının hatırlatmasını beklemek yerine Claude bunu
  kendi başına fark edip söylemeli.

## Notes / current state

- Permission system (Day 1 of `gelistirme-plani.md`) is complete: `PermissionController`,
  `PermissionService`, `PermissionRequirement`/`PermissionAuthorizationHandler`, 4 policies
  (`TICKET_CREATE`, `TICKET_ASSIGN`, `TICKET_STATUS_UPDATE`, `ADMIN_MANAGE`), all tested end-to-end
  (403 without grant, 200/204 with grant).
- **Ticket and Project visibility/confidentiality filters are implemented (Day 3).**
  `TicketService`/`ProjectService` both take a `userId` and check `ADMIN_MANAGE` first (bypass);
  non-admins are filtered via a correlated `ProjectMembers` subquery (`IsAdmin ? GetAllAsync() :
  GetAllForUserAsync(userId)` pattern). Unauthorized single-resource access returns 404, not 403
  (deliberate — avoids leaking existence of a resource the user can't see). See
  `docs/proje-gereksinimleri.md` §7 for the rationale.
- `Program.cs` has a temporary `/hash-test` endpoint marked `//todo: bunu sonradan kaldırıcam` — kept
  intentionally for now (demo purposes), remove before any production/merge.
- Ticket creation currently hardcodes `StatusId = 10` ("Açık") — that magic number depends on the `SeedStatuses` migration.
- SonarQube (brief-mandatory) is running locally via Docker (Community Edition, `localhost:9000`,
  container name `sonarqube` — restart with `docker start sonarqube`, don't `docker run` again).
  Project key `itsm-tool`. First scan (`dotnet sonarscanner begin/end`, run from `backend/`)
  completed successfully. `.sonarqube/` (scanner working files, regenerated every run) is
  gitignored — never commit it. Full findings review/cleanup is Day 6, final scan Day 10.
- Day 3 is fully complete: visibility filters, ticket comments (`CommentService` reuses
  `TicketService.GetTicketByIdAsync` for the access check instead of duplicating it — first case of
  a Service depending on another Service), and ticket attachments (`IFileStorageService`
  abstraction in Infrastructure, GUID-based stored filenames to avoid path traversal).
- **Gotcha found and fixed on Day 3:** any entity with a non-conventionally-named FK/navigation pair
  (like `Attachment.UploadedBy` / `UploadedByUser`) needs an explicit `HasForeignKey` in its
  `IEntityTypeConfiguration<T>`, or EF Core silently creates an unused shadow FK column and the real
  column never gets enforced/populated — this caused a real runtime FK violation on first use.
  `AttachmentConfiguration` was missing this (an oversight from the original bulk config pass); if a
  new FK violation shows up on an old, untested entity, check this first (`Notification`, `SlaBreach`,
  `AuditLog`, `AutoAssignmentRule`, `KnowledgeBaseArticle` haven't been exercised yet and may have the
  same latent issue).
- Admin panel backend, dashboard/reporting, SLA tracking, notifications, knowledge base, and the
  entire frontend are still outstanding — see `docs/gelistirme-plani.md` for the day-by-day
  breakdown.

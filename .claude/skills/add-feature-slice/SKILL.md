---
name: add-feature-slice
description: Add a new API feature (endpoint) to the ITSM backend following its Clean Architecture vertical-slice convention. Use when asked to add/implement a new endpoint, resource, or CRUD operation across Domain/Application/Infrastructure/API layers.
---

# Add a feature slice (ITSM backend)

Build a new endpoint by touching each layer in order, respecting the Domain ← Application ← Infrastructure ← API dependency rule. Mirror the existing Ticket/Permission slices for style. Not every step is always needed (e.g. reusing an existing entity), but keep the order.

## Steps

1. **Domain** (`src/ITSM.Domain/Entities`) — if a new table is involved, add/adjust the entity. Use `long` PKs, `required` for non-null columns, `DateTimeOffset` for timestamps (default `DateTimeOffset.UtcNow`), and non-null navs as `null!`. Cross-check `database/er-diagrams/schema-plan.md` for the intended shape.

2. **EF configuration** (`src/ITSM.Infrastructure/Persistence/Configurations`) — add an `IEntityTypeConfiguration<T>` class for a new entity (column types, keys, relationships, unique indexes). It's auto-registered via `ApplyConfigurationsFromAssembly`; do **not** edit `OnModelCreating`. Register the `DbSet<T>` in `AppDbContext` if new.

3. **Migration** — see the `add-migration` skill. Required whenever the schema changes.

4. **DTOs** (`src/ITSM.Application/DTOs`) — one request DTO and/or one response DTO per operation (e.g. `CreateXRequest`, `XResponse`). Plain classes with `required`/nullable properties. Never expose entities directly.

5. **Repository interface** (`src/ITSM.Application/Interfaces`) — `IXRepository` with async methods returning entities/primitives (not DTOs).

6. **Service** (`src/ITSM.Application/Services`) — a plain `XService` class depending on the repository *interface* only. Orchestrates logic and owns entity↔DTO mapping via a `private static MapToResponse(...)`. Never touch `AppDbContext` here.

7. **Repository impl** (`src/ITSM.Infrastructure/Persistence/Repositories`) — implement `IXRepository` over `AppDbContext`. Call `SaveChangesAsync` inside the repo. Use `.Include(...)` for navigations that mapping reads.

8. **Controller** (`src/ITSM.API/Controllers`) — thin `[ApiController]` with `[Route("api/[controller]")]` and `[Authorize]`. Get the user id via `long.Parse(User.FindFirst("sub")!.Value)`, call the service, return `Ok`/`NotFound`/`NoContent`/`Conflict`. Add `[Authorize(Policy = "PERMISSION_CODE")]` if the action is permission-gated.

9. **DI + policy** (`src/ITSM.API/Program.cs`) — register the repo and service:
   ```csharp
   builder.Services.AddScoped<IXRepository, XRepository>();
   builder.Services.AddScoped<XService>();
   ```
   If you introduced a new permission code, also register its policy:
   ```csharp
   options.AddPolicy("PERMISSION_CODE", p => p.Requirements.Add(new PermissionRequirement("PERMISSION_CODE")));
   ```

10. **Build & verify** — from `backend/`: `dotnet build`, then `dotnet test`. Run `dotnet run --project src/ITSM.API` to smoke-test.

Keep Turkish naming/comments consistent with surrounding files.

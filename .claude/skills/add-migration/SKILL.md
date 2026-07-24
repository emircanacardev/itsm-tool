---
name: add-migration
description: Create and apply an EF Core migration for the ITSM backend (PostgreSQL). Use when the entity model or Fluent API configuration changed and the database schema needs updating.
---

# Add an EF Core migration (ITSM backend)

Migrations live in `ITSM.Infrastructure`; `ITSM.API` is the startup project (it holds the connection string via user-secrets). Always run from the `backend/` directory.

## Prerequisites

- EF tools installed: `dotnet tool install --global dotnet-ef` (once per machine).
- A working DB connection string in user-secrets (`dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<...>" --project src/ITSM.API`). `database update` needs a reachable PostgreSQL.

## Steps

1. Make sure the entity + its `IEntityTypeConfiguration<T>` and the `DbSet<T>` in `AppDbContext` are updated first.

2. Create the migration (PascalCase, descriptive name):
   ```bash
   dotnet ef migrations add <Name> \
     --project src/ITSM.Infrastructure \
     --startup-project src/ITSM.API
   ```

3. Review the generated files under `src/ITSM.Infrastructure/Migrations` — check `Up`/`Down` match intent before applying. For seed/reference data, edit the migration's `Up` to add `migrationBuilder.InsertData(...)` (see `SeedStatuses` for the pattern).

4. Apply to the database:
   ```bash
   dotnet ef database update \
     --project src/ITSM.Infrastructure \
     --startup-project src/ITSM.API
   ```

5. `dotnet build` to confirm the snapshot compiles. Commit the migration `.cs`, `.Designer.cs`, and the updated `AppDbContextModelSnapshot.cs` together.

## Fixing a mistake

- Undo the last **unapplied** migration: `dotnet ef migrations remove --project src/ITSM.Infrastructure --startup-project src/ITSM.API`.
- Roll the DB back to an earlier migration: `dotnet ef database update <PreviousMigrationName> ...`, then remove.
- Never edit an already-applied/committed migration; add a new one instead.

using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace ITSM.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<Group> Groups => Set<Group>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Status> Statuses => Set<Status>();
    public DbSet<StatusTranslation> StatusTranslations => Set<StatusTranslation>();
    public DbSet<Priority> Priorities => Set<Priority>();
    public DbSet<PriorityTranslation> PriorityTranslations => Set<PriorityTranslation>();
    public DbSet<Sla> Slas => Set<Sla>();
    public DbSet<SlaBreach> SlaBreaches => Set<SlaBreach>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketStatusHistory> TicketStatusHistories => Set<TicketStatusHistory>();
    public DbSet<TicketAssignment> TicketAssignments => Set<TicketAssignment>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<KnowledgeBaseArticle> KnowledgeBaseArticles => Set<KnowledgeBaseArticle>();
    public DbSet<AutoAssignmentRule> AutoAssignmentRules => Set<AutoAssignmentRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Details, SaveChanges'ten ÖNCE üretilmek zorunda: kayıt yazıldıktan
        // sonra ChangeTracker girdileri Unchanged'a döner ve hangi alanın
        // neyden neye değiştiği bilgisi kaybolur.
        var trackedChanges = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog &&
                (e.State == EntityState.Added ||
                 e.State == EntityState.Modified ||
                 e.State == EntityState.Deleted))
            .Select(e => (Entity: e.Entity, State: e.State, Details: DescribeChange(e)))
            .ToList();

        var result = await base.SaveChangesAsync(cancellationToken);

        if (trackedChanges.Count > 0)
        {
            var currentUserId = GetCurrentUserId();

            foreach (var change in trackedChanges)
            {
                var idProperty = change.Entity.GetType().GetProperty("Id");
                var entityId = idProperty is not null ? (long)idProperty.GetValue(change.Entity)! : 0;

                AuditLogs.Add(new AuditLog
                {
                    UserId = currentUserId,
                    EntityName = change.Entity.GetType().Name,
                    EntityId = entityId,
                    Action = change.State.ToString(),
                    Details = change.Details
                });
            }

            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Değişikliği tek satırlık okunabilir bir özete çevirir. Aktivite
    /// Kaydı'ndaki "Detay" sütunu bunu gösteriyor; alan boş kaldığı sürece
    /// o sütun her satırda "-" yazıyordu.
    ///
    /// Güncellemede yalnızca gerçekten değişen alanlar, eski ve yeni
    /// değeriyle listeleniyor. Ekleme/silmede alan listesi anlamsız
    /// (hepsi yeni ya da hepsi gitti), o yüzden null bırakılıyor.
    /// </summary>
    private static string? DescribeChange(EntityEntry entry)
    {
        if (entry.State != EntityState.Modified)
        {
            return null;
        }

        var changes = new List<string>();

        foreach (var property in entry.Properties)
        {
            if (!property.IsModified || property.Metadata.IsPrimaryKey())
            {
                continue;
            }

            var name = property.Metadata.Name;

            // EF bazen değeri değişmemiş alanı da Modified işaretliyor
            // (ör. aynı değerle atama); gürültü olmasın diye eleniyor.
            // Gizli alanlarda değerler karşılaştırılıyor ama yazılmıyor.
            if (!AuditDetailFormatter.IsRedacted(name) &&
                AuditDetailFormatter.FormatValue(property.OriginalValue) ==
                AuditDetailFormatter.FormatValue(property.CurrentValue))
            {
                continue;
            }

            changes.Add(AuditDetailFormatter.DescribeProperty(
                name,
                property.OriginalValue,
                property.CurrentValue));
        }

        return changes.Count > 0 ? string.Join(", ", changes) : null;
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimNames.UserId)?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

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
    public DbSet<Priority> Priorities => Set<Priority>();
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
        var trackedChanges = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog &&
                (e.State == EntityState.Added ||
                 e.State == EntityState.Modified ||
                 e.State == EntityState.Deleted))
            .Select(e => (Entity: e.Entity, State: e.State))
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
                    Action = change.State.ToString()
                });
            }

            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimNames.UserId)?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
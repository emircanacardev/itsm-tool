namespace ITSM.Domain.Entities;

public class AuditLog
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public required string EntityName { get; set; }
    public required long EntityId { get; set; }
    public required string Action { get; set; }
    public string? Details { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
}

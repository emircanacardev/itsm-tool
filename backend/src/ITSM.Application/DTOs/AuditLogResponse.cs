namespace ITSM.Application.DTOs;

public class AuditLogResponse
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string? UserFullName { get; set; }
    public required string EntityName { get; set; }
    public long EntityId { get; set; }
    public required string Action { get; set; }
    public string? Details { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

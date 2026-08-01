namespace ITSM.Application.DTOs;

public class AuditLogFilterRequest
{
    public string? EntityName { get; set; }
    public long? UserId { get; set; }
    public string? Action { get; set; }
    public DateTimeOffset? FromDate { get; set; }
    public DateTimeOffset? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

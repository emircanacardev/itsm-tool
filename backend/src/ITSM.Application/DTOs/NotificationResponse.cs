namespace ITSM.Application.DTOs;

public class NotificationResponse
{
    public long Id { get; set; }
    public long? TicketId { get; set; }
    public required string Type { get; set; }
    public required string Message { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
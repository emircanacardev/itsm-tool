namespace ITSM.Domain.Entities;

public class Notification
{
    public long Id { get; set; }
    public required long UserId { get; set; }
    public long? TicketId { get; set; }
    public required string Type { get; set; }
    public required string Message { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User User { get; set; } = null!;
    public Ticket? Ticket { get; set; }
}

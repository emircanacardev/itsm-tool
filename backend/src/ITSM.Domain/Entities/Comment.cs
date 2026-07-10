namespace ITSM.Domain.Entities;

public class Comment
{
    public long Id { get; set; }
    public required long TicketId { get; set; }
    public required long UserId { get; set; }
    public required string Message { get; set; }
    public bool IsInternal { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Ticket Ticket { get; set; } = null!;
    public User User { get; set; } = null!;
}

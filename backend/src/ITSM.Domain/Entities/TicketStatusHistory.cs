namespace ITSM.Domain.Entities;

public class TicketStatusHistory
{
    public long Id { get; set; }
    public required long TicketId { get; set; }
    public long? OldStatusId { get; set; }
    public required long NewStatusId { get; set; }
    public required long ChangedBy { get; set; }
    public DateTimeOffset ChangedAt { get; set; } = DateTimeOffset.UtcNow;

    public Ticket Ticket { get; set; } = null!;
    public Status? OldStatus { get; set; }
    public Status NewStatus { get; set; } = null!;
    public User ChangedByUser { get; set; } = null!;
}

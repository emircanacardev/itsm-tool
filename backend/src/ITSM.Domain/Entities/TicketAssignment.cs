namespace ITSM.Domain.Entities;

public class TicketAssignment
{
    public long Id { get; set; }
    public required long TicketId { get; set; }
    public long? AssignedFrom { get; set; }
    public required long AssignedTo { get; set; }
    public required long AssignedBy { get; set; }
    public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? Note { get; set; }

    public Ticket Ticket { get; set; } = null!;
    public User? AssignedFromUser { get; set; }
    public User AssignedToUser { get; set; } = null!;
    public User AssignedByUser { get; set; } = null!;
}

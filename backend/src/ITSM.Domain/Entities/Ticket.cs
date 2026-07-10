using ITSM.Domain.Enums;

namespace ITSM.Domain.Entities;

public class Ticket
{
    public long Id { get; set; }
    public required long ProjectId { get; set; }
    public required long CategoryId { get; set; }
    public required TicketType TicketType { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required long StatusId { get; set; }
    public required long PriorityId { get; set; }
    public required long CreatedBy { get; set; }
    public long? AssignedTo { get; set; }
    public long? SlaId { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Project Project { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public Status Status { get; set; } = null!;
    public Priority Priority { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public User? AssignedToUser { get; set; }
    public Sla? Sla { get; set; }
}

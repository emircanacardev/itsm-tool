using ITSM.Domain.Enums;

namespace ITSM.Domain.Entities;

public class SlaBreach
{
    public long Id { get; set; }
    public required long TicketId { get; set; }
    public required BreachType BreachType { get; set; }
    public DateTimeOffset BreachedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool Notified { get; set; } = false;

    public Ticket Ticket { get; set; } = null!;
}

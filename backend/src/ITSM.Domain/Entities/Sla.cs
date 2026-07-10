namespace ITSM.Domain.Entities;

public class Sla
{
    public long Id { get; set; }
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public required long PriorityId { get; set; }
    public required int ResponseTimeMinutes { get; set; }
    public required int ResolutionTimeMinutes { get; set; }

    public Project? Project { get; set; }
    public Category? Category { get; set; }
    public Priority Priority { get; set; } = null!;
}

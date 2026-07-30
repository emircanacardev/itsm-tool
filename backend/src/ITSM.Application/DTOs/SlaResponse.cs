namespace ITSM.Application.DTOs;

public class SlaResponse
{
    public long Id { get; set; }
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public long PriorityId { get; set; }
    public required string PriorityName { get; set; }
    public int ResponseTimeMinutes { get; set; }
    public int ResolutionTimeMinutes { get; set; }
}
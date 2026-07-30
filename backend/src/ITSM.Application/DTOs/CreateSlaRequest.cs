namespace ITSM.Application.DTOs;

public class CreateSlaRequest
{
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public required long PriorityId { get; set; }
    public required int ResponseTimeMinutes { get; set; }
    public required int ResolutionTimeMinutes { get; set; }
}
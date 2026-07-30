namespace ITSM.Application.DTOs;

public class PriorityCountResponse
{
    public long PriorityId { get; set; }
    public required string PriorityName { get; set; }
    public int Count { get; set; }
}

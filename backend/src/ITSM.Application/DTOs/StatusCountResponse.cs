namespace ITSM.Application.DTOs;

public class StatusCountResponse
{
    public long StatusId { get; set; }
    public required string StatusName { get; set; }
    public int Count { get; set; }
}

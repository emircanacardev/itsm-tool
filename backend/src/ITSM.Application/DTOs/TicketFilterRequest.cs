namespace ITSM.Application.DTOs;

public class TicketFilterRequest
{
    public long? StatusId { get; set; }
    public long? PriorityId { get; set; }
    public long? ProjectId { get; set; }
    public DateTimeOffset? FromDate { get; set; }
    public DateTimeOffset? ToDate { get; set; }
    public string? Search { get; set; }
}
namespace ITSM.Application.DTOs;

public class TicketFilterRequest
{
    public long? StatusId { get; set; }
    public long? PriorityId { get; set; }
    public long? ProjectId { get; set; }
    public DateTimeOffset? FromDate { get; set; }
    public DateTimeOffset? ToDate { get; set; }
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
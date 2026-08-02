namespace ITSM.Application.DTOs;

public class RecentTicketResponse
{
    public required long Id { get; set; }
    public required string Title { get; set; }
    public required string StatusName { get; set; }
    public required string PriorityName { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public required DateTimeOffset CreatedAt { get; set; }
}

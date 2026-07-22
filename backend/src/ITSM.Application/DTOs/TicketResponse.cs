namespace ITSM.Application.DTOs;

public class TicketResponse
{
    public required long Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required string StatusName { get; set; }
    public required string PriorityName { get; set; }
    public required DateTimeOffset CreatedAt { get; set; }
}
namespace ITSM.Application.DTOs;

public class TicketResponse
{
    public required long Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required long StatusId { get; set; }
    public required string StatusName { get; set; }
    public required long PriorityId { get; set; }
    public required string PriorityName { get; set; }
    public required long ProjectId { get; set; }
    public required string ProjectName { get; set; }
    public required long CategoryId { get; set; }
    public required string CategoryName { get; set; }
    public required string TicketType { get; set; }
    public required long CreatedBy { get; set; }
    public required string CreatedByName { get; set; }
    public long? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public required DateTimeOffset CreatedAt { get; set; }
}

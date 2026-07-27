using ITSM.Domain.Enums;

namespace ITSM.Application.DTOs;

public class CreateTicketRequest
{
    public required long ProjectId { get; set; }
    public required long CategoryId { get; set; }
    public required TicketType TicketType { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public required long PriorityId { get; set; }
}
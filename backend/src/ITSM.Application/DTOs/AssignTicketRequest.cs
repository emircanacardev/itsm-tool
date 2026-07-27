namespace ITSM.Application.DTOs;

public class AssignTicketRequest
{
    public required long AssignedTo { get; set; }
    public string? Note { get; set; }
}
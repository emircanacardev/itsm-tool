namespace ITSM.Application.DTOs;

public class CreateGroupRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}
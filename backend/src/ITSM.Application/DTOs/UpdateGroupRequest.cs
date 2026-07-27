namespace ITSM.Application.DTOs;

public class UpdateGroupRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}
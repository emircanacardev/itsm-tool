namespace ITSM.Application.DTOs;

public class UpdateProjectRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required bool IsActive { get; set; }
}
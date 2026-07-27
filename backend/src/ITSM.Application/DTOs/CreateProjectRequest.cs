namespace ITSM.Application.DTOs;

public class CreateProjectRequest
{
    public required string Name { get; set; }
    public required string Code { get; set; }
    public string? Description { get; set; }
}
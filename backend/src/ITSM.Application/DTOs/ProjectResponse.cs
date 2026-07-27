namespace ITSM.Application.DTOs;

public class ProjectResponse
{
    public long Id { get; set; }
    public required string Name { get; set; }
    public required string Code { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
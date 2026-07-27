namespace ITSM.Application.DTOs;

public class GroupResponse
{
    public long Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
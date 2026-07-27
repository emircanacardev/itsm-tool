namespace ITSM.Application.DTOs;

public class CategoryResponse
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
}
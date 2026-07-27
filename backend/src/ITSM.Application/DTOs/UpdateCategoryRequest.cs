namespace ITSM.Application.DTOs;

public class UpdateCategoryRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}
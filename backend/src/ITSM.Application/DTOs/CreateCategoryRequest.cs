namespace ITSM.Application.DTOs;

public class CreateCategoryRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}
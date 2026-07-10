namespace ITSM.Domain.Entities;

public class Category
{
    public long Id { get; set; }
    public required long ProjectId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }

    public Project Project { get; set; } = null!;
}
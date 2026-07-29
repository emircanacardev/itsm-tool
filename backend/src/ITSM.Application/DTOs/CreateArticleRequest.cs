namespace ITSM.Application.DTOs;

public class CreateArticleRequest
{
    public required string Title { get; set; }
    public required string Content { get; set; }
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public bool IsPublished { get; set; } = false;
}
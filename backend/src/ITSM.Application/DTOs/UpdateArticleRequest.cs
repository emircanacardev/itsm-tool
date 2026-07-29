namespace ITSM.Application.DTOs;

public class UpdateArticleRequest
{
    public required string Title { get; set; }
    public required string Content { get; set; }
    public required bool IsPublished { get; set; }
}
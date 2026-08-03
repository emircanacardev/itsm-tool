namespace ITSM.Domain.Entities;

public class KnowledgeBaseArticle
{
    public long Id { get; set; }
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }
    public required long CreatedBy { get; set; }
    public bool IsPublished { get; set; } = false;

    /// <summary>
    /// Makalenin kaç kez görüntülendiği. "En çok okunan makaleler" listesi
    /// bunun üzerinden kuruluyor - hangi konuların tekrar tekrar arandığını,
    /// dolayısıyla hangi taleplerin önlenebileceğini gösteriyor.
    /// </summary>
    public int ViewCount { get; set; } = 0;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Project? Project { get; set; }
    public Category? Category { get; set; }
    public User CreatedByUser { get; set; } = null!;
}

namespace ITSM.Domain.Entities;

public class Priority
{
    public long Id { get; set; }

    /// <summary>
    /// Önceliğin varsayılan (Türkçe) adı; çeviri yoksa yedek olarak kullanılır.
    /// </summary>
    public required string Name { get; set; }

    public int SortOrder { get; set; }

    public ICollection<PriorityTranslation> Translations { get; set; } = [];
}

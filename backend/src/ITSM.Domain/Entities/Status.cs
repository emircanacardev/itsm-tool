namespace ITSM.Domain.Entities;

public class Status
{
    public long Id { get; set; }

    /// <summary>
    /// Durumun varsayılan (Türkçe) adı. Çeviri bulunmayan diller için
    /// yedek olarak kullanılır; gösterimde önce
    /// <see cref="Translations"/> içindeki karşılığa bakılır.
    /// </summary>
    public required string Name { get; set; }

    public int SortOrder { get; set; }

    public ICollection<StatusTranslation> Translations { get; set; } = [];
}

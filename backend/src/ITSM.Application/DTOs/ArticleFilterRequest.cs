namespace ITSM.Application.DTOs;

// Bilgi bankası listesinin arama/filtre/sıralama/sayfalama parametreleri.
// TicketFilterRequest ile aynı şekil: controller [FromQuery] ile tek nesne
// olarak bağlıyor, böylece yeni bir filtre eklemek imza değiştirmiyor.
public class ArticleFilterRequest
{
    public string? Search { get; set; }
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public string? SortBy { get; set; }

    // Varsayılan sıralama "en son güncellenen üstte" olduğu için azalan.
    public bool SortDescending { get; set; } = true;

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

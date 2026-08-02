namespace ITSM.Application.DTOs;

// Proje/Kategori/Öncelik kapsamı Sla'nın kimliği gibi - değiştirmek istenirse
// mevcut kaydı silip doğru kapsamla yeniden oluşturmak daha güvenli (aksi
// halde ProjectId/CategoryId/PriorityId'nin unique index'ini burada da
// kontrol etmek gerekirdi). Bu yüzden sadece süre alanları güncellenebilir.
public class UpdateSlaRequest
{
    public required int ResponseTimeMinutes { get; set; }
    public required int ResolutionTimeMinutes { get; set; }
}

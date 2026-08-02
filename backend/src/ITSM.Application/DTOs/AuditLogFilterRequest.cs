namespace ITSM.Application.DTOs;

public class AuditLogFilterRequest
{
    // Hem varlık tipine (ör. "Ticket", "User") hem de işlemi yapan kullanıcının
    // adına göre arar (OR) - eskiden sadece varlık adına bakıyordu, "User" örneği
    // placeholder'da olduğu için kullanıcılar bunun kişi adına göre arattığını
    // sanıyordu. Bkz. AuditLogRepository.GetAllAsync.
    public string? Search { get; set; }
    public long? UserId { get; set; }
    public string? Action { get; set; }
    public DateTimeOffset? FromDate { get; set; }
    public DateTimeOffset? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;

    // Sütun başlıklarına tıklayarak sıralama (bkz. admin.js sortField/sortDescending) -
    // varsayılan, sıralama hiç istenmezse önceki sabit davranışı (en yeni önce) korur.
    public string SortBy { get; set; } = "createdAt";
    public bool SortDescending { get; set; } = true;
}

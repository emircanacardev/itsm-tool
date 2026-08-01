namespace ITSM.Application.DTOs;

// Sayfalanmış liste dönen tüm endpoint'ler için ortak zarf (envelope).
// Bu projede ilk sayfalama kullanımı - ileride başka listeler (kullanıcılar,
// audit log vb.) sayfalanacaksa aynı şekli kullansınlar diye jenerik yapıldı.
public class PagedResult<T>
{
    public required List<T> Items { get; set; }
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

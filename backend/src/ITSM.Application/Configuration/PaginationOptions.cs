namespace ITSM.Application.Configuration;

/// <summary>
/// Listeleme endpoint'lerinin sayfalama sınırları.
/// appsettings.json'daki "Pagination" bölümünden bind edilir.
/// </summary>
public class PaginationOptions
{
    public const string SectionName = "Pagination";

    /// <summary>
    /// İstemci pageSize göndermediğinde kullanılan değer.
    /// </summary>
    public int DefaultPageSize { get; set; } = 20;

    /// <summary>
    /// İstemcinin talep edebileceği en büyük sayfa boyutu. Bunun üzerindeki
    /// istekler bu değere çekilir; tek bir istekle tüm tabloyu çekmeyi önler.
    /// </summary>
    public int MaxPageSize { get; set; } = 100;

    /// <summary>
    /// İstemciden gelen sayfa numarasını geçerli aralığa çeker.
    /// </summary>
    public int NormalizePage(int? page) => page is null or < 1 ? 1 : page.Value;

    /// <summary>
    /// İstemciden gelen sayfa boyutunu geçerli aralığa çeker.
    /// Geçersiz/eksik değerlerde varsayılana, aşırı değerlerde üst sınıra düşer.
    /// </summary>
    public int NormalizePageSize(int? pageSize)
    {
        if (pageSize is null or < 1)
        {
            return DefaultPageSize;
        }

        return pageSize.Value > MaxPageSize ? MaxPageSize : pageSize.Value;
    }
}

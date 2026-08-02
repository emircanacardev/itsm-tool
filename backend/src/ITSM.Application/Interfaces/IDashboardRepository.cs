namespace ITSM.Application.Interfaces;

public interface IDashboardRepository
{
    // includeAll true ise (admin) tüm ticket'lar; false ise sadece çağıran
    // kullanıcının oluşturduğu/atandığı/üyesi olduğu proje ticket'ları
    // (bkz. TicketRepository.GetAllAsync'teki aynı görünürlük filtresi).
    Task<int> GetTotalTicketCountAsync(long userId, bool includeAll);
    Task<List<(long StatusId, string StatusName, int Count)>> GetTicketCountsByStatusAsync(long userId, bool includeAll);
    Task<List<(long PriorityId, string PriorityName, int Count)>> GetTicketCountsByPriorityAsync(long userId, bool includeAll);
    Task<(int TotalWithSla, int BreachedCount)> GetSlaComplianceDataAsync(long userId, bool includeAll);

    // Açık (çözülmemiş/kapatılmamış) ve teslim tarihi 2 saat içinde olan ya da
    // geçmiş ticket sayısı - tickets.js'teki due-soon/due-overdue eşiğiyle aynı.
    Task<int> GetSlaAtRiskCountAsync(long userId, bool includeAll);

    // Bugün (UTC gün sınırı) çözülmüş ticket sayısı.
    Task<int> GetResolvedTodayCountAsync(long userId, bool includeAll);

    Task<List<(long Id, string Title, string StatusName, string PriorityName, DateTimeOffset? DueAt, DateTimeOffset CreatedAt)>> GetRecentTicketsAsync(long userId, bool includeAll, int count);
}

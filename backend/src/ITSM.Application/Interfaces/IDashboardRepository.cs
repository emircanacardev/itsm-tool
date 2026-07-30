namespace ITSM.Application.Interfaces;

public interface IDashboardRepository
{
    Task<int> GetTotalTicketCountAsync();
    Task<List<(long StatusId, string StatusName, int Count)>> GetTicketCountsByStatusAsync();
    Task<List<(long PriorityId, string PriorityName, int Count)>> GetTicketCountsByPriorityAsync();
    Task<(int TotalWithSla, int BreachedCount)> GetSlaComplianceDataAsync();
}

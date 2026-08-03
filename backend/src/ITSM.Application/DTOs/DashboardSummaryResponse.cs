namespace ITSM.Application.DTOs;

public class DashboardSummaryResponse
{
    public int TotalTickets { get; set; }
    public int OpenTickets { get; set; }
    public int ResolvedTickets { get; set; }
    public int ClosedTickets { get; set; }
    public int SlaAtRiskCount { get; set; }
    public int ResolvedTodayCount { get; set; }
    public List<StatusCountResponse> TicketsByStatus { get; set; } = new();
    public List<PriorityCountResponse> TicketsByPriority { get; set; } = new();
    public double SlaCompliancePercentage { get; set; }
    public List<RecentTicketResponse> RecentTickets { get; set; } = new();

    /// <summary>
    /// En çok görüntülenen bilgi bankası makaleleri. Hangi konuların
    /// tekrar tekrar arandığını gösteriyor.
    /// </summary>
    public List<ArticleResponse> MostViewedArticles { get; set; } = new();
}

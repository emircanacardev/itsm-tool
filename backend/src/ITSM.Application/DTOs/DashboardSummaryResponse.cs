namespace ITSM.Application.DTOs;

public class DashboardSummaryResponse
{
    public int TotalTickets { get; set; }
    public int OpenTickets { get; set; }
    public int ResolvedTickets { get; set; }
    public int ClosedTickets { get; set; }
    public List<StatusCountResponse> TicketsByStatus { get; set; } = new();
    public List<PriorityCountResponse> TicketsByPriority { get; set; } = new();
    public double SlaCompliancePercentage { get; set; }
}

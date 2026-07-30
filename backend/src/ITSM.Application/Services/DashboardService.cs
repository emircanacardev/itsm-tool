using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;

namespace ITSM.Application.Services;

public class DashboardService
{
    private readonly IDashboardRepository _dashboardRepository;

    public DashboardService(IDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public async Task<DashboardSummaryResponse> GetSummaryAsync()
    {
        var totalTickets = await _dashboardRepository.GetTotalTicketCountAsync();
        var statusCounts = await _dashboardRepository.GetTicketCountsByStatusAsync();
        var priorityCounts = await _dashboardRepository.GetTicketCountsByPriorityAsync();
        var (totalWithSla, breachedCount) = await _dashboardRepository.GetSlaComplianceDataAsync();

        var openTickets = statusCounts.Where(s => s.StatusId is 10 or 20 or 30).Sum(s => s.Count);
        var resolvedTickets = statusCounts.Where(s => s.StatusId == 40).Sum(s => s.Count);
        var closedTickets = statusCounts.Where(s => s.StatusId == 50).Sum(s => s.Count);

        var slaCompliancePercentage = totalWithSla == 0
            ? 100.0
            : Math.Round((double)(totalWithSla - breachedCount) / totalWithSla * 100, 2);

        return new DashboardSummaryResponse
        {
            TotalTickets = totalTickets,
            OpenTickets = openTickets,
            ResolvedTickets = resolvedTickets,
            ClosedTickets = closedTickets,
            TicketsByStatus = statusCounts
                .Select(s => new StatusCountResponse { StatusId = s.StatusId, StatusName = s.StatusName, Count = s.Count })
                .ToList(),
            TicketsByPriority = priorityCounts
                .Select(p => new PriorityCountResponse { PriorityId = p.PriorityId, PriorityName = p.PriorityName, Count = p.Count })
                .ToList(),
            SlaCompliancePercentage = slaCompliancePercentage
        };
    }
}

using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;

namespace ITSM.Application.Services;

public class DashboardService
{
    private readonly IDashboardRepository _dashboardRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;

    public DashboardService(IDashboardRepository dashboardRepository, IUserPermissionRepository userPermissionRepository)
    {
        _dashboardRepository = dashboardRepository;
        _userPermissionRepository = userPermissionRepository;
    }

    public async Task<DashboardSummaryResponse> GetSummaryAsync(long userId)
    {
        var includeAll = await _userPermissionRepository.HasPermissionAsync(userId, "ADMIN_MANAGE", null);

        var totalTickets = await _dashboardRepository.GetTotalTicketCountAsync(userId, includeAll);
        var statusCounts = await _dashboardRepository.GetTicketCountsByStatusAsync(userId, includeAll);
        var priorityCounts = await _dashboardRepository.GetTicketCountsByPriorityAsync(userId, includeAll);
        var (totalWithSla, breachedCount) = await _dashboardRepository.GetSlaComplianceDataAsync(userId, includeAll);
        var slaAtRiskCount = await _dashboardRepository.GetSlaAtRiskCountAsync(userId, includeAll);
        var resolvedTodayCount = await _dashboardRepository.GetResolvedTodayCountAsync(userId, includeAll);
        var recentTickets = await _dashboardRepository.GetRecentTicketsAsync(userId, includeAll, 5);

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
            SlaAtRiskCount = slaAtRiskCount,
            ResolvedTodayCount = resolvedTodayCount,
            TicketsByStatus = statusCounts
                .Select(s => new StatusCountResponse { StatusId = s.StatusId, StatusName = s.StatusName, Count = s.Count })
                .ToList(),
            TicketsByPriority = priorityCounts
                .Select(p => new PriorityCountResponse { PriorityId = p.PriorityId, PriorityName = p.PriorityName, Count = p.Count })
                .ToList(),
            SlaCompliancePercentage = slaCompliancePercentage,
            RecentTickets = recentTickets
                .Select(r => new RecentTicketResponse
                {
                    Id = r.Id,
                    Title = r.Title,
                    StatusName = r.StatusName,
                    PriorityName = r.PriorityName,
                    DueAt = r.DueAt,
                    CreatedAt = r.CreatedAt
                })
                .ToList()
        };
    }
}

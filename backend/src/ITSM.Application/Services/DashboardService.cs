using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;

namespace ITSM.Application.Services;

public class DashboardService
{
    /// <summary>Panelde gösterilen "Son Talepler" listesinin uzunluğu.</summary>
    private const int RecentTicketCount = 10;

    /// <summary>Panelde gösterilen "En Çok Okunan" makale sayısı.</summary>
    private const int MostViewedArticleCount = 3;

    private readonly IDashboardRepository _dashboardRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly ICurrentLanguageProvider _languageProvider;
    private readonly KnowledgeBaseArticleService _articleService;

    public DashboardService(
        IDashboardRepository dashboardRepository,
        IUserPermissionRepository userPermissionRepository,
        ICurrentLanguageProvider languageProvider,
        KnowledgeBaseArticleService articleService)
    {
        _dashboardRepository = dashboardRepository;
        _userPermissionRepository = userPermissionRepository;
        _languageProvider = languageProvider;
        // Makale listesini kendi repository'sinden değil, sahibi olan servisten
        // alıyoruz (bkz. CommentService -> TicketService): görünürlük ve DTO
        // eşlemesi orada tanımlı, burada kopyalanmamalı.
        _articleService = articleService;
    }

    public async Task<DashboardSummaryResponse> GetSummaryAsync(long userId)
    {
        var includeAll = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);
        var language = _languageProvider.GetCurrentLanguage();

        var totalTickets = await _dashboardRepository.GetTotalTicketCountAsync(userId, includeAll);
        var statusCounts = await _dashboardRepository.GetTicketCountsByStatusAsync(userId, includeAll, language);
        var priorityCounts = await _dashboardRepository.GetTicketCountsByPriorityAsync(userId, includeAll, language);
        var (totalWithSla, breachedCount) = await _dashboardRepository.GetSlaComplianceDataAsync(userId, includeAll);
        var slaAtRiskCount = await _dashboardRepository.GetSlaAtRiskCountAsync(userId, includeAll);
        var resolvedTodayCount = await _dashboardRepository.GetResolvedTodayCountAsync(userId, includeAll);
        var recentTickets = await _dashboardRepository.GetRecentTicketsAsync(userId, includeAll, RecentTicketCount, language);
        var mostViewedArticles = await _articleService.GetMostViewedArticlesAsync(MostViewedArticleCount);

        var openTickets = statusCounts.Where(s => TicketStatuses.OpenStates.Contains(s.StatusId)).Sum(s => s.Count);
        var resolvedTickets = statusCounts.Where(s => s.StatusId == TicketStatuses.Cozuldu).Sum(s => s.Count);
        var closedTickets = statusCounts.Where(s => s.StatusId == TicketStatuses.Kapatildi).Sum(s => s.Count);

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
                    StatusId = r.StatusId,
                    StatusName = r.StatusName,
                    PriorityId = r.PriorityId,
                    PriorityName = r.PriorityName,
                    DueAt = r.DueAt,
                    CreatedAt = r.CreatedAt
                })
                .ToList(),
            MostViewedArticles = mostViewedArticles
        };
    }
}

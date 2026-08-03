using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class DashboardRepository : IDashboardRepository
{
    /// <summary>
    /// "SLA riski" sayılan pencere: teslim tarihine bu kadar saat veya daha az
    /// kalmış açık ticket'lar riskli kabul edilir.
    /// </summary>
    private const int SlaRiskThresholdHours = 2;

    private readonly AppDbContext _context;

    public DashboardRepository(AppDbContext context)
    {
        _context = context;
    }

    // Görünürlük filtresi TicketRepository.GetAllAsync'teki includeAll deseniyle
    // birebir aynı: admin tüm ticket'ları görür, diğerleri sadece kendi
    // oluşturduğu/atandığı/üyesi olduğu proje ticket'larını.
    private IQueryable<Ticket> VisibleTickets(long userId, bool includeAll)
    {
        var query = _context.Tickets.AsQueryable();
        if (!includeAll)
        {
            query = query.Where(t =>
                t.CreatedBy == userId ||
                t.AssignedTo == userId ||
                _context.ProjectMembers.Any(pm => pm.ProjectId == t.ProjectId && pm.UserId == userId));
        }
        return query;
    }

    public async Task<int> GetTotalTicketCountAsync(long userId, bool includeAll)
    {
        return await VisibleTickets(userId, includeAll).CountAsync();
    }

    public async Task<List<(long StatusId, string StatusName, int Count)>> GetTicketCountsByStatusAsync(long userId, bool includeAll, string languageCode)
    {
        // Ad, istenen dildeki çeviriden alınıyor; çeviri yoksa Status.Name'e
        // düşülüyor. Gruplama Id üzerinden yapıldığı için sayımlar dilden
        // etkilenmiyor.
        var raw = await VisibleTickets(userId, includeAll)
            .GroupBy(t => t.StatusId)
            .Select(g => new
            {
                StatusId = g.Key,
                Count = g.Count(),
                StatusName = _context.StatusTranslations
                    .Where(tr => tr.StatusId == g.Key && tr.LanguageCode == languageCode)
                    .Select(tr => tr.Name)
                    .FirstOrDefault()
                    ?? _context.Statuses.Where(s => s.Id == g.Key).Select(s => s.Name).First()
            })
            .ToListAsync();

        return raw.Select(x => (x.StatusId, x.StatusName, x.Count)).ToList();
    }

    public async Task<List<(long PriorityId, string PriorityName, int Count)>> GetTicketCountsByPriorityAsync(long userId, bool includeAll, string languageCode)
    {
        var raw = await VisibleTickets(userId, includeAll)
            .GroupBy(t => t.PriorityId)
            .Select(g => new
            {
                PriorityId = g.Key,
                Count = g.Count(),
                PriorityName = _context.PriorityTranslations
                    .Where(tr => tr.PriorityId == g.Key && tr.LanguageCode == languageCode)
                    .Select(tr => tr.Name)
                    .FirstOrDefault()
                    ?? _context.Priorities.Where(p => p.Id == g.Key).Select(p => p.Name).First()
            })
            .ToListAsync();

        return raw.Select(x => (x.PriorityId, x.PriorityName, x.Count)).ToList();
    }

    public async Task<(int TotalWithSla, int BreachedCount)> GetSlaComplianceDataAsync(long userId, bool includeAll)
    {
        var visible = VisibleTickets(userId, includeAll);
        var totalWithSla = await visible.CountAsync(t => t.SlaId != null);

        var breachedCount = await visible
            .CountAsync(t => t.SlaId != null && _context.SlaBreaches.Any(b => b.TicketId == t.Id));

        return (totalWithSla, breachedCount);
    }

    public async Task<int> GetSlaAtRiskCountAsync(long userId, bool includeAll)
    {
        // Henüz kapanmamış ve teslim tarihi 2 saat içinde olan ya da geçmiş
        // ticket'lar - tickets.js'teki due-soon/due-overdue eşiğiyle aynı tanım.
        var riskThreshold = DateTimeOffset.UtcNow.AddHours(SlaRiskThresholdHours);
        return await VisibleTickets(userId, includeAll)
            .CountAsync(t => !TicketStatuses.ClosedStates.Contains(t.StatusId) && t.DueAt != null && t.DueAt <= riskThreshold);
    }

    public async Task<int> GetResolvedTodayCountAsync(long userId, bool includeAll)
    {
        var todayStart = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var tomorrowStart = todayStart.AddDays(1);
        return await VisibleTickets(userId, includeAll)
            .CountAsync(t => t.ResolvedAt != null && t.ResolvedAt >= todayStart && t.ResolvedAt < tomorrowStart);
    }

    public async Task<List<(long Id, string Title, long StatusId, string StatusName, long PriorityId, string PriorityName, DateTimeOffset? DueAt, DateTimeOffset CreatedAt)>> GetRecentTicketsAsync(long userId, bool includeAll, int count, string languageCode)
    {
        var raw = await VisibleTickets(userId, includeAll)
            .OrderByDescending(t => t.CreatedAt)
            .Take(count)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.StatusId,
                StatusName = t.Status.Translations
                    .Where(tr => tr.LanguageCode == languageCode)
                    .Select(tr => tr.Name)
                    .FirstOrDefault() ?? t.Status.Name,
                t.PriorityId,
                PriorityName = t.Priority.Translations
                    .Where(tr => tr.LanguageCode == languageCode)
                    .Select(tr => tr.Name)
                    .FirstOrDefault() ?? t.Priority.Name,
                t.DueAt,
                t.CreatedAt
            })
            .ToListAsync();

        return raw
            .Select(x => (x.Id, x.Title, x.StatusId, x.StatusName, x.PriorityId, x.PriorityName, x.DueAt, x.CreatedAt))
            .ToList();
    }
}

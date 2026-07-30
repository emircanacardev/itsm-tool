using ITSM.Application.Interfaces;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _context;

    public DashboardRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<int> GetTotalTicketCountAsync()
    {
        return await _context.Tickets.CountAsync();
    }

    public async Task<List<(long StatusId, string StatusName, int Count)>> GetTicketCountsByStatusAsync()
    {
        var raw = await _context.Tickets
            .GroupBy(t => new { t.StatusId, t.Status.Name })
            .Select(g => new { g.Key.StatusId, StatusName = g.Key.Name, Count = g.Count() })
            .ToListAsync();

        return raw.Select(x => (x.StatusId, x.StatusName, x.Count)).ToList();
    }

    public async Task<List<(long PriorityId, string PriorityName, int Count)>> GetTicketCountsByPriorityAsync()
    {
        var raw = await _context.Tickets
            .GroupBy(t => new { t.PriorityId, t.Priority.Name })
            .Select(g => new { g.Key.PriorityId, PriorityName = g.Key.Name, Count = g.Count() })
            .ToListAsync();

        return raw.Select(x => (x.PriorityId, x.PriorityName, x.Count)).ToList();
    }

    public async Task<(int TotalWithSla, int BreachedCount)> GetSlaComplianceDataAsync()
    {
        var totalWithSla = await _context.Tickets.CountAsync(t => t.SlaId != null);

        var breachedCount = await _context.Tickets
            .CountAsync(t => t.SlaId != null && _context.SlaBreaches.Any(b => b.TicketId == t.Id));

        return (totalWithSla, breachedCount);
    }
}

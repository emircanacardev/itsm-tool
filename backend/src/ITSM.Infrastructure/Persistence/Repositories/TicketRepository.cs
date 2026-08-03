using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class TicketRepository : ITicketRepository
{
    private readonly AppDbContext _context;

    public TicketRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Ticket?> GetByIdAsync(long id)
    {
        return await _context.Tickets
            .Include(t => t.Status).ThenInclude(s => s.Translations)
            .Include(t => t.Priority).ThenInclude(p => p.Translations)
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<(List<Ticket> Items, int TotalCount)> GetAllAsync(
        long userId,
        bool includeAll,
        long? statusId,
        long? priorityId,
        long? projectId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate,
        string? search,
        string? sortBy,
        bool sortDescending,
        int page,
        int pageSize)
    {
        // Npgsql, 'timestamp with time zone' kolonuna sadece Offset=0 (UTC) olan
        // DateTimeOffset değerleri yazılmasına izin veriyor. Query string'den
        // gelen tarih değerleri (ör. "2026-08-02") .NET tarafından sunucunun
        // yerel saat dilimiyle (ör. +03:00) parse ediliyor - ToUniversalTime()
        // aynı ânı UTC karşılığına çevirip Npgsql'in kabul ettiği forma sokuyor.
        fromDate = fromDate?.ToUniversalTime();
        toDate = toDate?.ToUniversalTime();

        var query = _context.Tickets
            .Include(t => t.Status).ThenInclude(s => s.Translations)
            .Include(t => t.Priority).ThenInclude(p => p.Translations)
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .AsQueryable();

        if (!includeAll)
        {
            query = query.Where(t =>
                t.CreatedBy == userId ||
                t.AssignedTo == userId ||
                _context.ProjectMembers.Any(pm => pm.ProjectId == t.ProjectId && pm.UserId == userId));
        }

        if (statusId is not null)
        {
            query = query.Where(t => t.StatusId == statusId);
        }

        if (priorityId is not null)
        {
            query = query.Where(t => t.PriorityId == priorityId);
        }

        if (projectId is not null)
        {
            query = query.Where(t => t.ProjectId == projectId);
        }

        if (fromDate is not null)
        {
            query = query.Where(t => t.CreatedAt >= fromDate);
        }

        if (toDate is not null)
        {
            query = query.Where(t => t.CreatedAt <= toDate);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(t => EF.Functions.ILike(t.Title, $"%{search}%"));
        }

        var totalCount = await query.CountAsync();

        // Açık bir ORDER BY olmadan Postgres sıralama garantisi vermiyor;
        // sortBy verilmemişse en yeni talep en üstte olacak şekilde varsayılan sıralama uygulanıyor.
        // Durum/öncelik için isim yerine SortOrder'a göre sıralıyoruz ki "Kritik > Yüksek > Orta > Düşük"
        // gibi anlamlı bir sıra korunsun (alfabetik değil).
        query = sortBy?.ToLowerInvariant() switch
        {
            "title" => sortDescending ? query.OrderByDescending(t => t.Title) : query.OrderBy(t => t.Title),
            "projectname" => sortDescending ? query.OrderByDescending(t => t.Project.Name) : query.OrderBy(t => t.Project.Name),
            "status" => sortDescending ? query.OrderByDescending(t => t.Status.SortOrder) : query.OrderBy(t => t.Status.SortOrder),
            "priority" => sortDescending ? query.OrderByDescending(t => t.Priority.SortOrder) : query.OrderBy(t => t.Priority.SortOrder),
            "assignedtoname" => sortDescending
                ? query.OrderByDescending(t => t.AssignedToUser != null ? t.AssignedToUser.FullName : null)
                : query.OrderBy(t => t.AssignedToUser != null ? t.AssignedToUser.FullName : null),
            "dueat" => sortDescending ? query.OrderByDescending(t => t.DueAt) : query.OrderBy(t => t.DueAt),
            _ => sortDescending ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task AddAsync(Ticket ticket)
    {
        _context.Tickets.Add(ticket);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(Ticket ticket, TicketStatusHistory history)
    {
        _context.Tickets.Update(ticket);
        _context.TicketStatusHistories.Add(history);
        await _context.SaveChangesAsync();
    }

    public async Task AssignAsync(Ticket ticket, TicketAssignment assignment)
    {
        _context.Tickets.Update(ticket);
        _context.TicketAssignments.Add(assignment);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Ticket>> GetActiveTicketsWithSlaAsync() =>
    await _context.Tickets
        .Where(t => t.SlaId != null && !TicketStatuses.ClosedStates.Contains(t.StatusId))
        .Include(t => t.Sla)
        .ToListAsync();

    public async Task<long?> GetLeastLoadedUserInGroupAsync(long groupId)
    {
        return await _context.Users
            .Where(u => u.GroupId == groupId && u.IsActive)
            .OrderBy(u => _context.Tickets.Count(t =>
                t.AssignedTo == u.Id && !TicketStatuses.ClosedStates.Contains(t.StatusId)))
            .Select(u => (long?)u.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<bool> ExistsByCategoryIdAsync(long categoryId)
    {
        return await _context.Tickets.AnyAsync(t => t.CategoryId == categoryId);
    }
}

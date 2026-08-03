using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _context;

    public ProjectRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Project?> GetByIdAsync(long id)
    {
        return await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<List<Project>> GetAllAsync()
    {
        return await _context.Projects.ToListAsync();
    }

    public async Task<Project?> GetByCodeAsync(string code)
    {
        return await _context.Projects.FirstOrDefaultAsync(p => p.Code == code);
    }

    public async Task AddAsync(Project project)
    {
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Project project)
    {
        _context.Projects.Update(project);
        await _context.SaveChangesAsync();
    }
    public async Task<List<Project>> GetAllForUserAsync(long userId)
    {
        return await _context.Projects
            .Where(p => _context.ProjectMembers.Any(pm => pm.ProjectId == p.Id && pm.UserId == userId))
            .ToListAsync();
    }

    public async Task<(List<Project> Items, int TotalCount)> GetAllPagedAsync(string? search, string? sortBy, bool sortDescending, int page, int pageSize)
    {
        var query = _context.Projects.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                EF.Functions.ILike(p.Name, $"%{search}%") ||
                EF.Functions.ILike(p.Code, $"%{search}%") ||
                (p.Description != null && EF.Functions.ILike(p.Description, $"%{search}%")));
        }

        // Projeler tablosundaki sütun başlıklarına tıklayarak sıralama -
        // bkz. TicketRepository.GetAllAsync'teki aynı sortBy switch pattern'i.
        query = sortBy?.ToLowerInvariant() switch
        {
            "code" => sortDescending ? query.OrderByDescending(p => p.Code) : query.OrderBy(p => p.Code),
            "description" => sortDescending ? query.OrderByDescending(p => p.Description) : query.OrderBy(p => p.Description),
            "status" => sortDescending ? query.OrderByDescending(p => p.IsActive) : query.OrderBy(p => p.IsActive),
            "createdat" => sortDescending ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
            _ => sortDescending ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name)
        };

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    // Sayaçlar tek sorguda alt-sorgu (correlated subquery) olarak hesaplanıyor.
    // "Açık" ve "gecikmiş" tanımı TicketStatuses.ClosedStates'ten geliyor -
    // kapanmış sayılan durumlar listesi değişirse burası da otomatik uyar.
    public async Task<List<ProjectStats>> GetStatsAsync(IEnumerable<long> projectIds)
    {
        var ids = projectIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var now = DateTimeOffset.UtcNow;

        return await _context.Projects
            .Where(p => ids.Contains(p.Id))
            .Select(p => new ProjectStats
            {
                ProjectId = p.Id,
                TicketCount = _context.Tickets.Count(t => t.ProjectId == p.Id),
                OpenTicketCount = _context.Tickets
                    .Count(t => t.ProjectId == p.Id && !TicketStatuses.ClosedStates.Contains(t.StatusId)),
                // Gecikmiş = süresi geçmiş ama hâlâ kapanmamış talep.
                OverdueTicketCount = _context.Tickets
                    .Count(t => t.ProjectId == p.Id
                        && t.DueAt != null
                        && t.DueAt < now
                        && !TicketStatuses.ClosedStates.Contains(t.StatusId)),
                MemberCount = _context.ProjectMembers.Count(pm => pm.ProjectId == p.Id)
            })
            .ToListAsync();
    }
}
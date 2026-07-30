using ITSM.Application.Interfaces;
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
         return await _context.Tickets.Include(t => t.Status).Include(t => t.Priority).FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<List<Ticket>> GetAllAsync(
        long userId,
        bool includeAll,
        long? statusId,
        long? priorityId,
        long? projectId,
        DateTimeOffset? fromDate,
        DateTimeOffset? toDate)
    {
        var query = _context.Tickets
            .Include(t => t.Status)
            .Include(t => t.Priority)
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

        return await query.ToListAsync();
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
        .Where(t => t.SlaId != null && t.StatusId != 40 && t.StatusId != 50)
        .Include(t => t.Sla)
        .ToListAsync();

    public async Task<long?> GetLeastLoadedUserInGroupAsync(long groupId)
    {
        return await _context.Users
            .Where(u => u.GroupId == groupId && u.IsActive)
            .OrderBy(u => _context.Tickets.Count(t =>
                t.AssignedTo == u.Id && t.StatusId != 40 && t.StatusId != 50))
            .Select(u => (long?)u.Id)
            .FirstOrDefaultAsync();
    }
}

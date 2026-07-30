using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class SlaRepository : ISlaRepository
{
    private readonly AppDbContext _context;

    public SlaRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Sla?> GetByIdAsync(long id)
    {
        return await _context.Slas
            .Include(s => s.Priority)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<List<Sla>> GetAllAsync()
    {
        return await _context.Slas
            .Include(s => s.Priority)
            .ToListAsync();
    }

    public async Task AddAsync(Sla sla)
    {
        _context.Slas.Add(sla);
        await _context.SaveChangesAsync();
    }
    public async Task<Sla?> GetByProjectCategoryPriorityAsync(long? projectId, long? categoryId, long priorityId)
    {
        return await _context.Slas.FirstOrDefaultAsync(s =>
            s.ProjectId == projectId &&
            s.CategoryId == categoryId &&
            s.PriorityId == priorityId);
    }

    public async Task<Sla?> GetApplicableSlaAsync(long projectId, long categoryId, long priorityId)
    {
        var sla = await _context.Slas.FirstOrDefaultAsync(s =>
            s.ProjectId == projectId && s.CategoryId == categoryId && s.PriorityId == priorityId);
        if (sla is not null) { return sla; }

        sla = await _context.Slas.FirstOrDefaultAsync(s =>
            s.ProjectId == projectId && s.CategoryId == null && s.PriorityId == priorityId);
        if (sla is not null) { return sla; }

        sla = await _context.Slas.FirstOrDefaultAsync(s =>
            s.ProjectId == null && s.CategoryId == categoryId && s.PriorityId == priorityId);
        if (sla is not null) { return sla; }

        sla = await _context.Slas.FirstOrDefaultAsync(s =>
            s.ProjectId == null && s.CategoryId == null && s.PriorityId == priorityId);
        return sla;
    }
}
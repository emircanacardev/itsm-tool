using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class AutoAssignmentRuleRepository : IAutoAssignmentRuleRepository
{
    private readonly AppDbContext _context;

    public AutoAssignmentRuleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AutoAssignmentRule?> GetByIdAsync(long id)
    {
        return await _context.AutoAssignmentRules.FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<List<AutoAssignmentRule>> GetByProjectAsync(long projectId)
    {
        return await _context.AutoAssignmentRules.Where(r => r.ProjectId == projectId).ToListAsync();
    }

    public async Task AddAsync(AutoAssignmentRule rule)
    {
        _context.AutoAssignmentRules.Add(rule);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(AutoAssignmentRule rule)
    {
        _context.AutoAssignmentRules.Remove(rule);
        await _context.SaveChangesAsync();
    }
}

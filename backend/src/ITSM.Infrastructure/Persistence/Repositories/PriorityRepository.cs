using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class PriorityRepository : IPriorityRepository
{
    private readonly AppDbContext _context;

    public PriorityRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Priority>> GetAllAsync()
    {
        return await _context.Priorities
            .Include(p => p.Translations)
            .OrderBy(p => p.SortOrder)
            .ToListAsync();
    }
}

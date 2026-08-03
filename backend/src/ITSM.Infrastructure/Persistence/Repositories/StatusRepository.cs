using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class StatusRepository : IStatusRepository
{
    private readonly AppDbContext _context;

    public StatusRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Status>> GetAllAsync()
    {
        // Çeviriler de yükleniyor; adın hangi dilde gösterileceğine
        // servis katmanı karar veriyor.
        return await _context.Statuses
            .Include(s => s.Translations)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();
    }
}

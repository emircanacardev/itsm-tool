using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Domain.Enums;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class SlaBreachRepository : ISlaBreachRepository
{
    private readonly AppDbContext _context;

    public SlaBreachRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SlaBreach?> GetByTicketAndTypeAsync(long ticketId, BreachType breachType) =>
        await _context.SlaBreaches.FirstOrDefaultAsync(b =>
            b.TicketId == ticketId && b.BreachType == breachType);

    public async Task AddAsync(SlaBreach breach)
    {
        _context.SlaBreaches.Add(breach);
        await _context.SaveChangesAsync();
    }
}
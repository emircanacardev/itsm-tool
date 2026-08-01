using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class GroupRepository : IGroupRepository
{
    private readonly AppDbContext _context;

    public GroupRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Group?> GetByIdAsync(long id)
    {
        return await _context.Groups.FirstOrDefaultAsync(g => g.Id == id);
    }

    public async Task<Group?> GetByNameAsync(string name)
    {
        return await _context.Groups.FirstOrDefaultAsync(g => g.Name == name);
    }

    public async Task<List<Group>> GetAllAsync()
    {
        return await _context.Groups.ToListAsync();
    }

    public async Task AddAsync(Group group)
    {
        _context.Groups.Add(group);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Group group)
    {
        _context.Groups.Update(group);
        await _context.SaveChangesAsync();
    }
}
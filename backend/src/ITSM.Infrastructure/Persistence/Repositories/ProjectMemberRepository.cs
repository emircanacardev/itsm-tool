using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class ProjectMemberRepository : IProjectMemberRepository
{
    private readonly AppDbContext _context;

    public ProjectMemberRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProjectMember?> GetByIdAsync(long id)
    {
        return await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.Id == id);
    }

    public async Task<List<ProjectMember>> GetAllByProjectIdAsync(long projectId)
    {
        return await _context.ProjectMembers
            .Include(pm => pm.User)
            .Where(pm => pm.ProjectId == projectId)
            .ToListAsync();
    }

    public async Task<ProjectMember?> GetByProjectAndUserAsync(long projectId, long userId)
    {
        return await _context.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
    }

    public async Task AddAsync(ProjectMember member)
    {
        _context.ProjectMembers.Add(member);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(ProjectMember member)
    {
        _context.ProjectMembers.Remove(member);
        await _context.SaveChangesAsync();
    }
}
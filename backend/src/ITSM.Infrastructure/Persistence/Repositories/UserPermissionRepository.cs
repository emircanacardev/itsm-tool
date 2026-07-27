using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class UserPermissionRepository : IUserPermissionRepository
{
    private readonly AppDbContext _context;

    public UserPermissionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> HasPermissionAsync(long userId, string permissionCode, long? projectId)
    {
        return await _context.UserPermissions
            .AnyAsync(up =>
                up.UserId == userId &&
                up.Permission.Code == permissionCode &&
                (up.ProjectId == null || up.ProjectId == projectId));
    }

    public async Task GrantAsync(UserPermission userPermission)
    {
        _context.UserPermissions.Add(userPermission);
        await _context.SaveChangesAsync();
    }

    public async Task<List<UserPermission>> GetByUserIdAsync(long userId)
    {
        return await _context.UserPermissions
            .Include(up => up.Permission)
            .Where(up => up.UserId == userId)
            .ToListAsync();
    }
}
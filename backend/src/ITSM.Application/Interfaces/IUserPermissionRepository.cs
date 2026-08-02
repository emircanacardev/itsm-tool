using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IUserPermissionRepository
{
    Task<bool> HasPermissionAsync(long userId, string permissionCode, long? projectId);
    Task GrantAsync(UserPermission userPermission);
    Task<List<UserPermission>> GetByUserIdAsync(long userId);
    Task<UserPermission?> GetByIdAsync(long id);
    Task RevokeAsync(UserPermission userPermission);
}
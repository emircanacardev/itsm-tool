using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class PermissionService
{
    private readonly IUserPermissionRepository _userPermissionRepository;

    public PermissionService(IUserPermissionRepository userPermissionRepository)
    {
        _userPermissionRepository = userPermissionRepository;
    }

    public async Task GrantPermissionAsync(long userId, GrantPermissionRequest request)
    {
        var userPermission = new UserPermission
        {
            UserId = userId,
            PermissionId = request.PermissionId,
            ProjectId = request.ProjectId
        };

        await _userPermissionRepository.GrantAsync(userPermission);
    }

    public async Task<List<UserPermissionResponse>> GetUserPermissionsAsync(long userId)
    {
        var permissions = await _userPermissionRepository.GetByUserIdAsync(userId);

        return permissions.Select(p => new UserPermissionResponse
        {
            Id = p.Id,
            PermissionCode = p.Permission.Code,
            PermissionName = p.Permission.Name,
            ProjectId = p.ProjectId,
            GrantedAt = p.GrantedAt
        }).ToList();
    }
}
using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class PermissionService
{
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly IPermissionRepository _permissionRepository;

    public PermissionService(IUserPermissionRepository userPermissionRepository, IPermissionRepository permissionRepository)
    {
        _userPermissionRepository = userPermissionRepository;
        _permissionRepository = permissionRepository;
    }

    public async Task<List<PermissionResponse>> GetAllPermissionsAsync()
    {
        var permissions = await _permissionRepository.GetAllAsync();

        return permissions.Select(p => new PermissionResponse
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            Description = p.Description
        }).ToList();
    }

    public async Task<bool> RevokeAsync(long userId, long id)
    {
        var userPermission = await _userPermissionRepository.GetByIdAsync(id);
        if (userPermission is null || userPermission.UserId != userId)
        {
            return false;
        }

        await _userPermissionRepository.RevokeAsync(userPermission);
        return true;
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
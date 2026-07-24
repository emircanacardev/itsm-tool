using ITSM.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace ITSM.Infrastructure.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IUserPermissionRepository _userPermissionRepository;

    public PermissionAuthorizationHandler(IUserPermissionRepository userPermissionRepository)
    {
        _userPermissionRepository = userPermissionRepository;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userIdClaim = context.User.FindFirst("sub")?.Value;
        if (userIdClaim is null)
        {
            return;
        }

        var userId = long.Parse(userIdClaim);

        var hasPermission = await _userPermissionRepository.HasPermissionAsync(userId, requirement.PermissionCode, null);
        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}
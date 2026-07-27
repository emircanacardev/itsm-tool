using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/users/{userId}/permissions")]
[Authorize(Policy = "ADMIN_MANAGE")]
public class PermissionController : ControllerBase
{
    private readonly PermissionService _permissionService;

    public PermissionController(PermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    [HttpPost]
    public async Task<IActionResult> GrantPermission(long userId, GrantPermissionRequest request)
    {
        await _permissionService.GrantPermissionAsync(userId, request);
        return NoContent();
    }

    [HttpGet]
    public async Task<IActionResult> GetUserPermissions(long userId)
    {
        var result = await _permissionService.GetUserPermissionsAsync(userId);
        return Ok(result);
    }
}
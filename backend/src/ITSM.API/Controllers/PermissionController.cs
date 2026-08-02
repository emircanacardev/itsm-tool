using ITSM.Application.DTOs;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/users/{userId}/permissions")]
[Authorize(Policy = Permissions.AdminManage)]
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokePermission(long userId, long id)
    {
        var success = await _permissionService.RevokeAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }

    // Bu controller "api/users/{userId}/permissions" altında iç içe geçmiş
    // durumda; sistemde tanımlı TÜM yetki kataloğunu listelemek (bir
    // kullanıcıya özel olmadan) için mutlak yol ile ayrı bir uç nokta.
    [HttpGet("/api/permissions")]
    public async Task<IActionResult> GetAllPermissions()
    {
        var result = await _permissionService.GetAllPermissionsAsync();
        return Ok(result);
    }
}
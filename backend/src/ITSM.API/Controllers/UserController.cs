using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ADMIN_MANAGE")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var result = await _userService.GetAllUsersAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(long id)
    {
        var result = await _userService.GetUserByIdAsync(id);
        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(long id, UpdateUserStatusRequest request)
    {
        var success = await _userService.UpdateUserStatusAsync(id, request.IsActive);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}

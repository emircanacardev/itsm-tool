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
    public async Task<IActionResult> GetAllUsers([FromQuery] string? search, [FromQuery] int? page, [FromQuery] int? pageSize)
    {
        // page verilmezse eski davranış korunuyor: search doluysa typeahead
        // (Yetkilendirme sekmesindeki arama kutusu, en fazla 20 sonuç),
        // boşsa tam liste. page verilince Kullanıcılar tablosu için
        // sayfalanmış + toplam sayılı sonuç dönülüyor.
        if (page.HasValue)
        {
            var pagedResult = await _userService.GetAllUsersPagedAsync(search, page.Value, pageSize ?? 20);
            return Ok(pagedResult);
        }

        var result = await _userService.GetAllUsersAsync(search);
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

    [HttpPut("{id}/group")]
    public async Task<IActionResult> UpdateUserGroup(long id, UpdateUserGroupRequest request)
    {
        var success = await _userService.UpdateUserGroupAsync(id, request.GroupId);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}

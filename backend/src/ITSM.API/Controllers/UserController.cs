using ITSM.Domain.Constants;
using ITSM.API.Extensions;
using ITSM.Application.Configuration;
using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ITSM.API.Controllers;

// Sınıf seviyesinde ADMIN_MANAGE değil: proje detayındaki "ekibe üye ekle"
// kutusu da kullanıcı araması yapıyor ve orada PROJECT_MANAGE yetiyor.
// Yetki action bazında; tam liste/sayfalama ve kullanıcı düzenleme hâlâ admin işi.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly UserService _userService;
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly PaginationOptions _paginationOptions;

    public UserController(
        UserService userService,
        IUserPermissionRepository userPermissionRepository,
        IOptions<PaginationOptions> paginationOptions)
    {
        _userService = userService;
        _userPermissionRepository = userPermissionRepository;
        _paginationOptions = paginationOptions.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers(
        [FromQuery] string? search,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? sortBy,
        [FromQuery] bool sortDescending = false)
    {
        // Bu action iki ayrı ihtiyaca hizmet ediyor, yetkileri de ayrı:
        // arama terimi verilen typeahead çağrısı (en fazla 20 sonuç) proje
        // yöneticisine de açık; filtresiz tam liste ve sayfalanmış tablo
        // yalnızca admin'e. Aksi halde PROJECT_MANAGE'i olan biri tüm
        // kullanıcı dizinini çekebilirdi.
        var isAdmin = await _userPermissionRepository.HasPermissionAsync(
            User.GetUserId(), Permissions.AdminManage, null);
        if (!isAdmin && string.IsNullOrWhiteSpace(search))
        {
            return Forbid();
        }

        // page verilmezse eski davranış korunuyor: search doluysa typeahead
        // (Yetkilendirme sekmesindeki arama kutusu, en fazla 20 sonuç),
        // boşsa tam liste. page verilince Kullanıcılar tablosu için
        // sayfalanmış + toplam sayılı sonuç dönülüyor.
        if (page.HasValue)
        {
            if (!isAdmin)
            {
                return Forbid();
            }

            var pagedResult = await _userService.GetAllUsersPagedAsync(
                search,
                sortBy,
                sortDescending,
                _paginationOptions.NormalizePage(page),
                _paginationOptions.NormalizePageSize(pageSize));
            return Ok(pagedResult);
        }

        var result = await _userService.GetAllUsersAsync(search);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = Permissions.AdminManage)]
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
    [Authorize(Policy = Permissions.AdminManage)]
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
    [Authorize(Policy = Permissions.AdminManage)]
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

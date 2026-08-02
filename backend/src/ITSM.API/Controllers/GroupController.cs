using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ADMIN_MANAGE")]
public class GroupController : ControllerBase
{
    private readonly GroupService _groupService;

    public GroupController(GroupService groupService)
    {
        _groupService = groupService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup(CreateGroupRequest request)
    {
        var result = await _groupService.CreateGroupAsync(request);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllGroups(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] bool sortDescending = false)
    {
        // page verilmezse eski davranış (tam liste) korunuyor - şu an tek
        // tüketicisi admin panelindeki Gruplar sekmesi, o da artık page geçiyor.
        if (page.HasValue)
        {
            var pagedResult = await _groupService.GetAllGroupsPagedAsync(search, sortBy, sortDescending, page.Value, pageSize ?? 20);
            return Ok(pagedResult);
        }

        var result = await _groupService.GetAllGroupsAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetGroupById(long id)
    {
        var result = await _groupService.GetGroupByIdAsync(id);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGroup(long id, UpdateGroupRequest request)
    {
        var success = await _groupService.UpdateGroupAsync(id, request);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
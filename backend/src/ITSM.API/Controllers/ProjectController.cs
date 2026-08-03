using ITSM.Application.DTOs;
using ITSM.API.Extensions;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using ITSM.Application.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectController : ControllerBase
{
    private readonly ProjectService _projectService;
    private readonly PaginationOptions _paginationOptions;

    public ProjectController(ProjectService projectService, IOptions<PaginationOptions> paginationOptions)
    {
        _projectService = projectService;
        _paginationOptions = paginationOptions.Value;
    }

    [HttpPost]
    [Authorize(Policy = Permissions.AdminManage)]
    public async Task<IActionResult> CreateProject(CreateProjectRequest request)
    {
        var result = await _projectService.CreateProjectAsync(request);
        if (result is null)
        {
            return Conflict();
        }
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllProjects(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] bool sortDescending = false)
    {
        var userId = User.GetUserId();

        // page verilmezse eski davranış (tam liste) korunuyor - dropdown'lar
        // (yeni talep formu, ticket filtresi, yetki verme ekranı) bunu bekliyor.
        // page verilince admin panelindeki Projeler tablosu için sayfalanmış sonuç dönülüyor.
        if (page.HasValue)
        {
            var pagedResult = await _projectService.GetAllProjectsPagedAsync(
                userId,
                search,
                sortBy,
                sortDescending,
                _paginationOptions.NormalizePage(page),
                _paginationOptions.NormalizePageSize(pageSize));
            return Ok(pagedResult);
        }

        var result = await _projectService.GetAllProjectsAsync(userId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(long id)
    {
        var userId = User.GetUserId();

        var result = await _projectService.GetProjectByIdAsync(id, userId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Permissions.AdminManage)]
    public async Task<IActionResult> UpdateProject(long id, UpdateProjectRequest request)
    {
        var success = await _projectService.UpdateProjectAsync(id, request);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectController : ControllerBase
{
    private readonly ProjectService _projectService;

    public ProjectController(ProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpPost]
    [Authorize(Policy = "ADMIN_MANAGE")]
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
    public async Task<IActionResult> GetAllProjects([FromQuery] int? page, [FromQuery] int? pageSize)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        // page verilmezse eski davranış (tam liste) korunuyor - dropdown'lar
        // (yeni talep formu, ticket filtresi, yetki verme ekranı) bunu bekliyor.
        // page verilince admin panelindeki Projeler tablosu için sayfalanmış sonuç dönülüyor.
        if (page.HasValue)
        {
            var pagedResult = await _projectService.GetAllProjectsPagedAsync(userId, page.Value, pageSize ?? 20);
            return Ok(pagedResult);
        }

        var result = await _projectService.GetAllProjectsAsync(userId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(long id)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var result = await _projectService.GetProjectByIdAsync(id, userId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "ADMIN_MANAGE")]
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
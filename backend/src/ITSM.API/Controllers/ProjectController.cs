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
    public async Task<IActionResult> GetAllProjects()
    {
        var result = await _projectService.GetAllProjectsAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(long id)
    {
        var result = await _projectService.GetProjectByIdAsync(id);
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
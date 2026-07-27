using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/members")]
[Authorize(Policy = "ADMIN_MANAGE")]
public class ProjectMemberController : ControllerBase
{
    private readonly ProjectMemberService _projectMemberService;

    public ProjectMemberController(ProjectMemberService projectMemberService)
    {
        _projectMemberService = projectMemberService;
    }

    [HttpPost]
    public async Task<IActionResult> AddMember(long projectId, AddProjectMemberRequest request)
    {
        var (result, member) = await _projectMemberService.AddMemberAsync(projectId, request);

        return result switch
        {
            AddMemberResult.ProjectNotFound => NotFound("Project not found"),
            AddMemberResult.UserNotFound => NotFound("User not found"),
            AddMemberResult.AlreadyMember => Conflict(),
            _ => Ok(member)
        };
    }

    [HttpGet]
    public async Task<IActionResult> GetMembers(long projectId)
    {
        var result = await _projectMemberService.GetMembersByProjectAsync(projectId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveMember(long projectId, long id)
    {
        var success = await _projectMemberService.RemoveMemberAsync(projectId, id);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
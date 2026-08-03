using ITSM.Application;
using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/members")]
[Authorize(Policy = Permissions.AdminManage)]
public class ProjectMemberController : ControllerBase
{
    private readonly ProjectMemberService _projectMemberService;
    private readonly ILocalizedMessageProvider _messageProvider;

    public ProjectMemberController(
        ProjectMemberService projectMemberService,
        ILocalizedMessageProvider messageProvider)
    {
        _projectMemberService = projectMemberService;
        _messageProvider = messageProvider;
    }

    [HttpPost]
    public async Task<IActionResult> AddMember(long projectId, AddProjectMemberRequest request)
    {
        var (result, member) = await _projectMemberService.AddMemberAsync(projectId, request);

        return result switch
        {
            AddMemberResult.ProjectNotFound => NotFound(_messageProvider.Get(MessageKeys.ErrorProjectNotFound)),
            AddMemberResult.UserNotFound => NotFound(_messageProvider.Get(MessageKeys.ErrorUserNotFound)),
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
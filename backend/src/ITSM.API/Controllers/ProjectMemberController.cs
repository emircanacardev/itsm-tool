using ITSM.Application;
using ITSM.Application.DTOs;
using ITSM.API.Extensions;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

// Üye listesini okumak projenin kendi üyelerine de açık (proje detayındaki
// "Ekip" sekmesi); ekleme/çıkarma ise admin işi olduğu için yetki artık
// sınıf seviyesinde değil, action bazında veriliyor.
[ApiController]
[Route("api/project/{projectId}/members")]
[Authorize]
public class ProjectMemberController : ControllerBase
{
    private readonly ProjectMemberService _projectMemberService;
    private readonly ProjectService _projectService;
    private readonly ILocalizedMessageProvider _messageProvider;

    public ProjectMemberController(
        ProjectMemberService projectMemberService,
        ProjectService projectService,
        ILocalizedMessageProvider messageProvider)
    {
        _projectMemberService = projectMemberService;
        _projectService = projectService;
        _messageProvider = messageProvider;
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ProjectManage)]
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
        // Erişim kontrolü ProjectService'e devrediliyor: görme yetkisi yoksa
        // null döner ve biz de 404 veririz - projenin varlığını sızdırmamak
        // için 403 yerine 404 (bkz. proje-gereksinimleri.md §7).
        var project = await _projectService.GetProjectByIdAsync(projectId, User.GetUserId());
        if (project is null)
        {
            return NotFound();
        }

        var result = await _projectMemberService.GetMembersByProjectAsync(projectId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Permissions.ProjectManage)]
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
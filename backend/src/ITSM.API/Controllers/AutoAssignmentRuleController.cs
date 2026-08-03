using ITSM.Application;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/auto-assignment-rules")]
[Authorize(Policy = Permissions.AdminManage)]
public class AutoAssignmentRuleController : ControllerBase
{
    private readonly AutoAssignmentService _autoAssignmentService;
    private readonly ILocalizedMessageProvider _messageProvider;

    public AutoAssignmentRuleController(
        AutoAssignmentService autoAssignmentService,
        ILocalizedMessageProvider messageProvider)
    {
        _autoAssignmentService = autoAssignmentService;
        _messageProvider = messageProvider;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRule(long projectId, CreateAutoAssignmentRuleRequest request)
    {
        var result = await _autoAssignmentService.CreateRuleAsync(projectId, request);
        if (result is null)
        {
            return BadRequest(_messageProvider.Get(MessageKeys.ErrorRuleAssignTargetInvalid));
        }

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetRules(long projectId)
    {
        var result = await _autoAssignmentService.GetRulesForProjectAsync(projectId);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(long projectId, long id)
    {
        var success = await _autoAssignmentService.DeleteRuleAsync(id, projectId);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}

using ITSM.Domain.Constants;
using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Permissions.AdminManage)]
public class AuditLogController : ControllerBase
{
    private readonly AuditLogService _auditLogService;

    public AuditLogController(AuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllAuditLogs([FromQuery] AuditLogFilterRequest filter)
    {
        var result = await _auditLogService.GetAllAsync(filter);
        return Ok(result);
    }
}

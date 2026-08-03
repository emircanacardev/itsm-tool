using ITSM.Application.DTOs;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

// SLA yazma işlemleri bilerek ADMIN_MANAGE'de bırakıldı (kategori ve ekip
// yönetimi PROJECT_MANAGE'e taşınmışken): bir SLA kuralının ProjectId'si
// null olabiliyor, yani tüm projeleri etkileyen genel bir kural yazılabiliyor.
// Ayrıca proje id'si route'ta değil gövdede geldiği için yetki katmanı
// kuralın hangi projeye ait olduğunu göremiyor - proje kapsamlı bir yetkiyle
// açmak, o kullanıcının global kural yazmasına da izin vermek olurdu.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SlaController : ControllerBase
{
    private readonly SlaService _slaService;

    public SlaController(SlaService slaService)
    {
        _slaService = slaService;
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ProjectManage)]
    public async Task<IActionResult> CreateSla(CreateSlaRequest request)
    {
        var result = await _slaService.CreateSlaAsync(request);
        if (result is null)
        {
            return Conflict();
        }
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSlas()
    {
        var result = await _slaService.GetAllSlasAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSlaById(long id)
    {
        var result = await _slaService.GetSlaByIdAsync(id);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Permissions.ProjectManage)]
    public async Task<IActionResult> UpdateSla(long id, UpdateSlaRequest request)
    {
        var success = await _slaService.UpdateSlaAsync(id, request);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Permissions.ProjectManage)]
    public async Task<IActionResult> DeleteSla(long id)
    {
        var success = await _slaService.DeleteSlaAsync(id);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
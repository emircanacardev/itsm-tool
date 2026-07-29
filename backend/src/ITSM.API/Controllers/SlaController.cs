using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

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
    [Authorize(Policy = "ADMIN_MANAGE")]
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
}
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PriorityController : ControllerBase
{
    private readonly PriorityService _priorityService;

    public PriorityController(PriorityService priorityService)
    {
        _priorityService = priorityService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPriorities()
    {
        var result = await _priorityService.GetAllPrioritiesAsync();
        return Ok(result);
    }
}

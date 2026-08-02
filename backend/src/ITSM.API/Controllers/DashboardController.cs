using ITSM.API.Extensions;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;

    public DashboardController(DashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // Dashboard artık herkese açık - ADMIN_MANAGE yetkisi olmayan kullanıcılar
    // için servis kendi oluşturduğu/atandığı/üyesi olduğu proje ticket'larıyla
    // sınırlı bir özet döner (bkz. TicketService.GetAllTicketsAsync'teki aynı
    // görünürlük kuralı).
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var userId = User.GetUserId();

        var result = await _dashboardService.GetSummaryAsync(userId);
        return Ok(result);
    }
}

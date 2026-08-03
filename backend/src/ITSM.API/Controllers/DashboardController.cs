using ITSM.API.Extensions;
using ITSM.Application.Services;
using ITSM.Domain.Constants;
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

    // REPORT_VIEW gerekiyor. Panel yalnızca kullanıcının görebildiği
    // ticket'ları özetliyor (bkz. DashboardRepository.VisibleTickets), yani
    // veri sızıntısı riski yok; ancak toplu sayılar, SLA uyum oranı ve
    // "bugün çözülen" gibi ölçümler yönetsel bilgidir ve her kullanıcının
    // ihtiyacı olmaz. Brief §3.2 bunu ayrı bir yetki olarak sayıyor.
    [HttpGet("summary")]
    [Authorize(Policy = Permissions.ReportView)]
    public async Task<IActionResult> GetSummary()
    {
        var userId = User.GetUserId();

        var result = await _dashboardService.GetSummaryAsync(userId);
        return Ok(result);
    }
}

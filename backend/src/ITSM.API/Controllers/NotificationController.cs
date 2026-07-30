using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly NotificationService _notificationService;

    public NotificationController(NotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var result = await _notificationService.GetMyNotificationsAsync(userId);
        return Ok(result);
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var success = await _notificationService.MarkAsReadAsync(id, userId);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}
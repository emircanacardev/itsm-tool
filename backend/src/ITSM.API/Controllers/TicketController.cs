using ITSM.Application.DTOs;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketController : ControllerBase
{
    private readonly TicketService _ticketService;
    public TicketController(TicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpPost]
    [Authorize(Policy = "TICKET_CREATE")]
    public async Task<IActionResult> CreateTicket(CreateTicketRequest request)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var result = await _ticketService.CreateTicketAsync(request, userId);
        
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTickets()
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var result = await _ticketService.GetAllTicketsAsync(userId);

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTicketById(long id)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var result = await _ticketService.GetTicketByIdAsync(id, userId);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{id}/status")]
    [Authorize(Policy = "TICKET_STATUS_UPDATE")]
    public async Task<IActionResult> UpdateStatus(long id, UpdateTicketStatusRequest request)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var success = await _ticketService.UpdateTicketStatusAsync(id, request.NewStatusId, userId);

        if (!success)
        {
            return NotFound();
        }

        return NoContent();

    }

    [HttpPut("{id}/assign")]
    [Authorize(Policy = "TICKET_ASSIGN")]
    public async Task<IActionResult> AssignTicket(long id, AssignTicketRequest request)
    {
        var userIdClaim = User.FindFirst("sub")?.Value;
        var userId = long.Parse(userIdClaim!);

        var success = await _ticketService.AssignTicketAsync(id, request.AssignedTo, userId, request.Note);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}

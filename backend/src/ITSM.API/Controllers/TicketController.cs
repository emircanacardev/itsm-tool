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
        var result = await _ticketService.GetAllTicketsAsync();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTicketById(long id)
    {
        var result = await _ticketService.GetTicketByIdAsync(id);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{id}/status")]
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

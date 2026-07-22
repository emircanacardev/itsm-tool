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
}

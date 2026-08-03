using ITSM.Application.DTOs;
using ITSM.API.Extensions;
using ITSM.Domain.Constants;
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
    private readonly UserService _userService;

    public TicketController(TicketService ticketService, UserService userService)
    {
        _ticketService = ticketService;
        _userService = userService;
    }

    [HttpGet("assignable-users")]
    [Authorize(Policy = Permissions.TicketAssign)]
    public async Task<IActionResult> GetAssignableUsers()
    {
        var result = await _userService.GetAssignableUsersAsync();
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.TicketCreate)]
    public async Task<IActionResult> CreateTicket(CreateTicketRequest request)
    {
        var userId = User.GetUserId();

        var result = await _ticketService.CreateTicketAsync(request, userId);
        
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTickets([FromQuery] TicketFilterRequest filter)
    {
        var userId = User.GetUserId();

        var result = await _ticketService.GetAllTicketsAsync(userId, filter);

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTicketById(long id)
    {
        var userId = User.GetUserId();

        var result = await _ticketService.GetTicketByIdAsync(id, userId);

        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    [HttpPut("{id}/status")]
    [Authorize(Policy = Permissions.TicketStatusUpdate)]
    public async Task<IActionResult> UpdateStatus(long id, UpdateTicketStatusRequest request)
    {
        var userId = User.GetUserId();

        var success = await _ticketService.UpdateTicketStatusAsync(id, request.NewStatusId, userId);

        if (!success)
        {
            return NotFound();
        }

        return NoContent();

    }

    [HttpPut("{id}/assign")]
    [Authorize(Policy = Permissions.TicketAssign)]
    public async Task<IActionResult> AssignTicket(long id, AssignTicketRequest request)
    {
        var userId = User.GetUserId();

        var success = await _ticketService.AssignTicketAsync(id, request.AssignedTo, userId, request.Note);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}

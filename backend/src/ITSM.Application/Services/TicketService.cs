using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class TicketService
{
    private readonly ITicketRepository _ticketRepository;

    public TicketService(ITicketRepository ticketRepository)
    {
        _ticketRepository = ticketRepository;
    }

    public async Task<TicketResponse> CreateTicketAsync(CreateTicketRequest request, long createdByUserId)
    {
        var ticket = new Ticket
        {
            ProjectId = request.ProjectId,
            CategoryId = request.CategoryId,
            TicketType = request.TicketType,
            Title = request.Title,
            Description = request.Description,
            StatusId = 10, // "Açık"
            PriorityId = request.PriorityId,
            CreatedBy = createdByUserId
        };

        await _ticketRepository.AddAsync(ticket);

        var createdTicket = await _ticketRepository.GetByIdAsync(ticket.Id);
        return MapToResponse(createdTicket!);
    }

    public async Task<TicketResponse?> GetTicketByIdAsync(long id)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket is null)
        {
            return null;
        }

        return MapToResponse(ticket);
    }

    public async Task<List<TicketResponse>> GetAllTicketsAsync()
    {
        var tickets = await _ticketRepository.GetAllAsync();
        return tickets.Select(MapToResponse).ToList();
    }

    private static TicketResponse MapToResponse(Ticket ticket)
    {
        return new TicketResponse
        {
            Id = ticket.Id,
            Title = ticket.Title,
            Description = ticket.Description,
            StatusName = ticket.Status.Name,
            PriorityName = ticket.Priority.Name,
            CreatedAt = ticket.CreatedAt
        };
    }

    public async Task<bool> UpdateTicketStatusAsync(long ticketId, long newStatusId, long changedByUserId)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId);
        if (ticket is null)
        {
            return false;
        }

        var history = new TicketStatusHistory
        {
            TicketId = ticket.Id,
            OldStatusId = ticket.StatusId,
            NewStatusId = newStatusId,
            ChangedBy = changedByUserId
        };

        ticket.StatusId = newStatusId;

        await _ticketRepository.UpdateStatusAsync(ticket, history);

        return true;
    }
}
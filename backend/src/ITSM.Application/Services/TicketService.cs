using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class TicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly IProjectMemberRepository _projectMemberRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly ISlaRepository _slaRepository;

    public TicketService(
        ITicketRepository ticketRepository,
        IUserPermissionRepository userPermissionRepository,
        IProjectMemberRepository projectMemberRepository,
        INotificationRepository notificationRepository,
        ISlaRepository slaRepository)
    {
        _ticketRepository = ticketRepository;
        _userPermissionRepository = userPermissionRepository;
        _projectMemberRepository = projectMemberRepository;
        _notificationRepository = notificationRepository;
        _slaRepository = slaRepository;
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

        var applicableSla = await _slaRepository.GetApplicableSlaAsync(
            request.ProjectId, request.CategoryId, request.PriorityId);

        if (applicableSla is not null)
        {
            ticket.SlaId = applicableSla.Id;
            ticket.DueAt = DateTimeOffset.UtcNow.AddMinutes(applicableSla.ResolutionTimeMinutes);
        }

        await _ticketRepository.AddAsync(ticket);

        var createdTicket = await _ticketRepository.GetByIdAsync(ticket.Id);
        return MapToResponse(createdTicket!);
    }

    public async Task<TicketResponse?> GetTicketByIdAsync(long id, long userId)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket is null)
        {
            return null;
        }

        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, "ADMIN_MANAGE", null);
        if (isAdmin)
        {
            return MapToResponse(ticket);
        }

        var isCreator = ticket.CreatedBy == userId;
        var isAssignee = ticket.AssignedTo == userId;
        var isProjectMember = await _projectMemberRepository.GetByProjectAndUserAsync(ticket.ProjectId, userId) is not null;

        if (!isCreator && !isAssignee && !isProjectMember)
        {
            return null;
        }

        return MapToResponse(ticket);
    }

    public async Task<List<TicketResponse>> GetAllTicketsAsync(long userId, TicketFilterRequest filter)
    {
        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, "ADMIN_MANAGE", null);

        var tickets = await _ticketRepository.GetAllAsync(
            userId,
            includeAll: isAdmin,
            statusId: filter.StatusId,
            priorityId: filter.PriorityId,
            projectId: filter.ProjectId,
            fromDate: filter.FromDate,
            toDate: filter.ToDate);

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

        if (ticket.CreatedBy != changedByUserId)
        {
            var notification = new Notification
            {
                UserId = ticket.CreatedBy,
                TicketId = ticket.Id,
                Type = "TicketStatusChanged",
                Message = $"\"{ticket.Title}\" başlıklı talebinizin durumu güncellendi."
            };

            await _notificationRepository.AddAsync(notification);
        }

        return true;
    }

    public async Task<bool> AssignTicketAsync(long ticketId, long assignedToUserId, long assignedByUserId, string? note)
    {
        var ticket = await _ticketRepository.GetByIdAsync(ticketId);
        if (ticket is null)
        {
            return false;
        }

        var assignment = new TicketAssignment
        {
            TicketId = ticket.Id,
            AssignedFrom = ticket.AssignedTo,
            AssignedTo = assignedToUserId,
            AssignedBy = assignedByUserId,
            Note = note
        };

        ticket.AssignedTo = assignedToUserId;

        await _ticketRepository.AssignAsync(ticket, assignment);

        if (assignedToUserId != assignedByUserId)
        {
            var notification = new Notification
            {
                UserId = assignedToUserId,
                TicketId = ticket.Id,
                Type = "TicketAssigned",
                Message = $"\"{ticket.Title}\" başlıklı talep size atandı."
            };

            await _notificationRepository.AddAsync(notification);
        }

        return true;
    }
}
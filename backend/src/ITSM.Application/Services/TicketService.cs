using ITSM.Application.Configuration;
using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Microsoft.Extensions.Options;

namespace ITSM.Application.Services;

public class TicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly IProjectMemberRepository _projectMemberRepository;
    private readonly NotificationService _notificationService;
    private readonly ISlaRepository _slaRepository;
    private readonly AutoAssignmentService _autoAssignmentService;
    private readonly ICurrentLanguageProvider _languageProvider;
    private readonly PaginationOptions _paginationOptions;

    public TicketService(
        ITicketRepository ticketRepository,
        IUserPermissionRepository userPermissionRepository,
        IProjectMemberRepository projectMemberRepository,
        NotificationService notificationService,
        ISlaRepository slaRepository,
        AutoAssignmentService autoAssignmentService,
        ICurrentLanguageProvider languageProvider,
        IOptions<PaginationOptions> paginationOptions)
    {
        _ticketRepository = ticketRepository;
        _userPermissionRepository = userPermissionRepository;
        _projectMemberRepository = projectMemberRepository;
        _notificationService = notificationService;
        _slaRepository = slaRepository;
        _autoAssignmentService = autoAssignmentService;
        _languageProvider = languageProvider;
        _paginationOptions = paginationOptions.Value;
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
            StatusId = TicketStatuses.Default,
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

        var autoAssignedUserId = await _autoAssignmentService.GetAssigneeForTicketAsync(
            request.ProjectId, request.CategoryId);

        if (autoAssignedUserId is not null)
        {
            ticket.AssignedTo = autoAssignedUserId;
        }

        await _ticketRepository.AddAsync(ticket);

        if (autoAssignedUserId is not null)
        {
            var assignment = new TicketAssignment
            {
                TicketId = ticket.Id,
                AssignedFrom = null,
                AssignedTo = autoAssignedUserId.Value,
                AssignedBy = createdByUserId,
                Note = "Otomatik atama kuralına göre atandı."
            };

            await _ticketRepository.AssignAsync(ticket, assignment);

            await _notificationService.CreateNotificationAsync(
                autoAssignedUserId.Value,
                ticket.Id,
                "TicketAssigned",
                $"\"{ticket.Title}\" başlıklı talep otomatik olarak size atandı.");
        }

        var createdTicket = await _ticketRepository.GetByIdAsync(ticket.Id);
        return MapToResponse(createdTicket!, _languageProvider.GetCurrentLanguage());
    }

    public async Task<TicketResponse?> GetTicketByIdAsync(long id, long userId)
    {
        var ticket = await _ticketRepository.GetByIdAsync(id);
        if (ticket is null)
        {
            return null;
        }

        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);
        if (isAdmin)
        {
            return MapToResponse(ticket, _languageProvider.GetCurrentLanguage());
        }

        var isCreator = ticket.CreatedBy == userId;
        var isAssignee = ticket.AssignedTo == userId;
        var isProjectMember = await _projectMemberRepository.GetByProjectAndUserAsync(ticket.ProjectId, userId) is not null;

        if (!isCreator && !isAssignee && !isProjectMember)
        {
            return null;
        }

        return MapToResponse(ticket, _languageProvider.GetCurrentLanguage());
    }

    public async Task<PagedResult<TicketResponse>> GetAllTicketsAsync(long userId, TicketFilterRequest filter)
    {
        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);

        // Sayfa/sayfa boyutu için mantıksız/kötü niyetli değerlere karşı sınır koyuyoruz.
        var page = _paginationOptions.NormalizePage(filter.Page);
        var pageSize = _paginationOptions.NormalizePageSize(filter.PageSize);

        var (items, totalCount) = await _ticketRepository.GetAllAsync(
            userId,
            includeAll: isAdmin,
            statusId: filter.StatusId,
            priorityId: filter.PriorityId,
            projectId: filter.ProjectId,
            fromDate: filter.FromDate,
            toDate: filter.ToDate,
            search: filter.Search,
            sortBy: filter.SortBy,
            sortDescending: filter.SortDescending,
            page: page,
            pageSize: pageSize);

        var language = _languageProvider.GetCurrentLanguage();

        return new PagedResult<TicketResponse>
        {
            Items = items.Select(t => MapToResponse(t, language)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private static TicketResponse MapToResponse(Ticket ticket, string language)
    {
        return new TicketResponse
        {
            Id = ticket.Id,
            Title = ticket.Title,
            Description = ticket.Description,
            StatusId = ticket.StatusId,
            StatusName = ticket.Status.GetLocalizedName(language),
            PriorityId = ticket.PriorityId,
            PriorityName = ticket.Priority.GetLocalizedName(language),
            ProjectId = ticket.ProjectId,
            ProjectName = ticket.Project.Name,
            CategoryId = ticket.CategoryId,
            CategoryName = ticket.Category.Name,
            TicketType = ticket.TicketType.ToString(),
            CreatedBy = ticket.CreatedBy,
            CreatedByName = ticket.CreatedByUser.FullName,
            AssignedTo = ticket.AssignedTo,
            AssignedToName = ticket.AssignedToUser?.FullName,
            DueAt = ticket.DueAt,
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

        // Talep "Çözüldü"ye geçtiğinde çözülme anını damgalıyoruz; dashboard'daki
        // "Bugün Çözülen" sayacı bu alanı okuyor. Tekrar açılırsa (Çözüldü'den
        // başka bir duruma dönerse) damga temizlenmeli, yoksa kapanmamış bir
        // talep çözülmüş gibi sayılır.
        if (newStatusId == TicketStatuses.Cozuldu)
        {
            ticket.ResolvedAt ??= DateTimeOffset.UtcNow;
        }
        else if (newStatusId != TicketStatuses.Kapatildi)
        {
            ticket.ResolvedAt = null;
        }

        await _ticketRepository.UpdateStatusAsync(ticket, history);

        if (ticket.CreatedBy != changedByUserId)
        {
            await _notificationService.CreateNotificationAsync(
                ticket.CreatedBy,
                ticket.Id,
                "TicketStatusChanged",
                $"\"{ticket.Title}\" başlıklı talebinizin durumu güncellendi.");
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
            await _notificationService.CreateNotificationAsync(
                assignedToUserId,
                ticket.Id,
                "TicketAssigned",
                $"\"{ticket.Title}\" başlıklı talep size atandı.");
        }

        return true;
    }
}
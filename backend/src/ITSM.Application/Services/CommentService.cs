using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Application.Notifications;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class CommentService
{
    private readonly ICommentRepository _commentRepository;
    private readonly TicketService _ticketService;
    private readonly IUserRepository _userRepository;
    private readonly NotificationService _notificationService;

    public CommentService(
        ICommentRepository commentRepository,
        TicketService ticketService,
        IUserRepository userRepository,
        NotificationService notificationService)
    {
        _commentRepository = commentRepository;
        _ticketService = ticketService;
        _userRepository = userRepository;
        _notificationService = notificationService;
    }

    public async Task<CommentResponse?> AddCommentAsync(long ticketId, long userId, CreateCommentRequest request)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(ticketId, userId);
        if (ticket is null)
        {
            return null;
        }

        var user = await _userRepository.GetByIdAsync(userId);

        var comment = new Comment
        {
            TicketId = ticketId,
            UserId = userId,
            Message = request.Message,
            IsInternal = request.IsInternal
        };

        await _commentRepository.AddAsync(comment);

        await NotifyParticipantsAsync(ticket, userId, user!.FullName, request.IsInternal);

        return MapToResponse(comment, user!);
    }

    /// <summary>
    /// Yorumdan haberdar olması gerekenlere bildirim gönderir: talebi açan
    /// kişi ve talebin atandığı kişi.
    ///
    /// Yorumu yazan kendi yorumu için bildirim almıyor. Talebi açan kişiyle
    /// atanan kişi aynıysa tek bildirim gidiyor.
    ///
    /// Dahili notlar talebi açana gitmiyor: "dahili" olmasının sebebi zaten
    /// talep sahibinin görmemesi. Yorum listesi de aynı ayrımı yapıyor.
    /// </summary>
    private async Task NotifyParticipantsAsync(
        TicketResponse ticket,
        long commentedByUserId,
        string commentedByName,
        bool isInternal)
    {
        var recipients = new HashSet<long>();

        if (!isInternal)
        {
            recipients.Add(ticket.CreatedBy);
        }

        if (ticket.AssignedTo.HasValue)
        {
            recipients.Add(ticket.AssignedTo.Value);
        }

        recipients.Remove(commentedByUserId);

        foreach (var recipientId in recipients)
        {
            await _notificationService.CreateNotificationAsync(
                recipientId,
                ticket.Id,
                NotificationTypes.TicketCommented,
                new NotificationPayload
                {
                    TicketTitle = ticket.Title,
                    ActorName = commentedByName
                });
        }
    }

    public async Task<List<CommentResponse>?> GetCommentsAsync(long ticketId, long userId)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(ticketId, userId);
        if (ticket is null)
        {
            return null;
        }

        var comments = await _commentRepository.GetAllByTicketIdAsync(ticketId);
        return comments.Select(c => MapToResponse(c, c.User)).ToList();
    }

    private static CommentResponse MapToResponse(Comment comment, User user)
    {
        return new CommentResponse
        {
            Id = comment.Id,
            TicketId = comment.TicketId,
            UserId = comment.UserId,
            UserFullName = user.FullName,
            Message = comment.Message,
            IsInternal = comment.IsInternal,
            CreatedAt = comment.CreatedAt
        };
    }
}
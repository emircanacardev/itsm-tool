using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class NotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public NotificationService(
        INotificationRepository notificationRepository,
        IUserRepository userRepository,
        IEmailService emailService)
    {
        _notificationRepository = notificationRepository;
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task CreateNotificationAsync(long userId, long? ticketId, string type, string message)
    {
        var notification = new Notification
        {
            UserId = userId,
            TicketId = ticketId,
            Type = type,
            Message = message
        };

        await _notificationRepository.AddAsync(notification);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is not null)
        {
            await _emailService.SendEmailAsync(user.Email, $"ITSM Bildirim: {type}", message);
        }
    }

    public async Task<List<NotificationResponse>> GetMyNotificationsAsync(long userId)
    {
        var notifications = await _notificationRepository.GetAllByUserIdAsync(userId);
        return notifications.Select(MapToResponse).ToList();
    }

    public async Task<bool> MarkAsReadAsync(long id, long userId)
    {
        var notification = await _notificationRepository.GetByIdAsync(id);
        if (notification is null || notification.UserId != userId)
        {
            return false;
        }

        notification.IsRead = true;
        await _notificationRepository.UpdateAsync(notification);
        return true;
    }

    private static NotificationResponse MapToResponse(Notification notification)
    {
        return new NotificationResponse
        {
            Id = notification.Id,
            TicketId = notification.TicketId,
            Type = notification.Type,
            Message = notification.Message,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };
    }
}
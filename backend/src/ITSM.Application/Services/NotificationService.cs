using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;

namespace ITSM.Application.Services;

public class NotificationService
{
    private readonly INotificationRepository _notificationRepository;

    public NotificationService(INotificationRepository notificationRepository)
    {
        _notificationRepository = notificationRepository;
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

    private static NotificationResponse MapToResponse(Domain.Entities.Notification notification)
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
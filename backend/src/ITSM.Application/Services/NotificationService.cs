using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Application.Notifications;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class NotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;
    private readonly NotificationRenderer _renderer;
    private readonly ILocalizedMessageProvider _messageProvider;
    private readonly ICurrentLanguageProvider _languageProvider;

    public NotificationService(
        INotificationRepository notificationRepository,
        IUserRepository userRepository,
        IEmailService emailService,
        NotificationRenderer renderer,
        ILocalizedMessageProvider messageProvider,
        ICurrentLanguageProvider languageProvider)
    {
        _notificationRepository = notificationRepository;
        _userRepository = userRepository;
        _emailService = emailService;
        _renderer = renderer;
        _messageProvider = messageProvider;
        _languageProvider = languageProvider;
    }

    /// <summary>
    /// Bildirimi kaydeder ve alıcıya e-posta gönderir.
    ///
    /// Kayıtta hazır cümle değil, tür + payload saklanıyor; cümle okuma
    /// anında üretiliyor. E-posta ise anlık gönderildiği için burada
    /// üretiliyor - ve alıcının kendi dil tercihine göre, isteği tetikleyen
    /// kişinin diline göre değil.
    /// </summary>
    public async Task CreateNotificationAsync(long userId, long? ticketId, string type, NotificationPayload payload)
    {
        var notification = new Notification
        {
            UserId = userId,
            TicketId = ticketId,
            Type = type,
            PayloadJson = NotificationRenderer.SerializePayload(payload)
        };

        await _notificationRepository.AddAsync(notification);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            return;
        }

        var body = _renderer.Render(notification, user.PreferredLanguage);
        var subject = _messageProvider.GetFor(user.PreferredLanguage, MessageKeys.EmailNotificationSubject);

        await _emailService.SendEmailAsync(user.Email, subject, body);
    }

    public async Task<List<NotificationResponse>> GetMyNotificationsAsync(long userId)
    {
        var notifications = await _notificationRepository.GetAllByUserIdAsync(userId);
        var language = _languageProvider.GetCurrentLanguage();

        return notifications.Select(n => MapToResponse(n, language)).ToList();
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

    private NotificationResponse MapToResponse(Notification notification, string language)
    {
        return new NotificationResponse
        {
            Id = notification.Id,
            TicketId = notification.TicketId,
            Type = notification.Type,
            // Message alanı DTO'da kalıyor (frontend sözleşmesi değişmesin diye)
            // ama artık saklanan bir metin değil, okuma anında üretiliyor.
            Message = _renderer.Render(notification, language),
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };
    }
}

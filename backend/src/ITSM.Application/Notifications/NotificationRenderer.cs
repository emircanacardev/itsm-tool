using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using ITSM.Domain.Enums;
using System.Text.Json;

namespace ITSM.Application.Notifications;

/// <summary>
/// Bildirimin saklanan hâlinden (tür + payload) okunabilir cümleyi üretir.
///
/// Bu ayrım i18n'in temeli: veritabanında hazır cümle saklansaydı, dil
/// değiştirildiğinde geçmiş bildirimler yazıldıkları dilde kalırdı.
/// </summary>
public class NotificationRenderer
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly ILocalizedMessageProvider _messageProvider;

    public NotificationRenderer(ILocalizedMessageProvider messageProvider)
    {
        _messageProvider = messageProvider;
    }

    public static string SerializePayload(NotificationPayload payload)
    {
        return JsonSerializer.Serialize(payload, SerializerOptions);
    }

    /// <summary>
    /// Bildirimi verilen dilde cümleye dönüştürür.
    /// </summary>
    public string Render(Notification notification, string languageCode)
    {
        var payload = DeserializePayload(notification.PayloadJson);
        var ticketTitle = payload?.TicketTitle ?? string.Empty;

        return notification.Type switch
        {
            NotificationTypes.TicketAssigned =>
                _messageProvider.GetFor(languageCode, MessageKeys.NotificationTicketAssigned, ticketTitle),

            NotificationTypes.TicketAutoAssigned =>
                _messageProvider.GetFor(languageCode, MessageKeys.NotificationTicketAutoAssigned, ticketTitle),

            NotificationTypes.TicketStatusChanged =>
                _messageProvider.GetFor(languageCode, MessageKeys.NotificationTicketStatusChanged, ticketTitle),

            NotificationTypes.TicketCommented =>
                _messageProvider.GetFor(
                    languageCode,
                    MessageKeys.NotificationTicketCommented,
                    ticketTitle,
                    payload?.ActorName ?? string.Empty),

            NotificationTypes.SlaBreach => RenderSlaBreach(languageCode, ticketTitle, payload),

            // Tanınmayan bir tür (ör. ileride eklenip burada ele alınmamış)
            // uygulamayı düşürmemeli; en azından başlık gösterilsin.
            _ => ticketTitle
        };
    }

    private string RenderSlaBreach(string languageCode, string ticketTitle, NotificationPayload? payload)
    {
        // Atanan kişiye giden cümle ihlal türünü zaten içeriyor (yalnızca
        // çözüm ihlallerinde gönderiliyor), o yüzden ayrıca etiket almıyor.
        if (payload?.IsAssigneeNotification == true)
        {
            return _messageProvider.GetFor(
                languageCode,
                MessageKeys.NotificationSlaBreachAssignee,
                ticketTitle);
        }

        var isResolutionBreach = payload?.BreachType == nameof(BreachType.Resolution);

        var breachLabel = _messageProvider.GetFor(
            languageCode,
            isResolutionBreach ? MessageKeys.SlaBreachTypeResolution : MessageKeys.SlaBreachTypeResponse);

        return _messageProvider.GetFor(
            languageCode,
            MessageKeys.NotificationSlaBreachReporter,
            ticketTitle,
            breachLabel);
    }

    private static NotificationPayload? DeserializePayload(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<NotificationPayload>(payloadJson, SerializerOptions);
        }
        catch (JsonException)
        {
            // Bozuk bir payload bildirim listesinin tamamını düşürmemeli.
            return null;
        }
    }
}

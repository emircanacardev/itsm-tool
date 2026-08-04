namespace ITSM.Application;

/// <summary>
/// Messages.resx / Messages.en.resx dosyaları için tip anahtarı.
/// IStringLocalizer&lt;Messages&gt; şeklinde enjekte edilir; sınıfın kendisi
/// üye içermez, yalnızca resource dosyalarını adresler.
///
/// Bu sınıf bilinçli olarak assembly kök namespace'inde (ITSM.Application)
/// duruyor. ResourceManagerStringLocalizerFactory, resource adını
/// "&lt;RootNamespace&gt;.&lt;ResourcesPath&gt;.&lt;TipinKökeGöreYolu&gt;"
/// şeklinde kurar; tip Localization klasörünün altında olsaydı yol iki kez
/// eklenir ("...Localization.Localization.Messages") ve hiçbir çeviri
/// bulunamazdı.
///
/// Anahtar isimleri <see cref="MessageKeys"/> içinde sabit olarak tutulur.
/// </summary>
public class Messages
{
}

/// <summary>
/// Resource anahtarları. Elle string yazmak yerine buradaki sabitler
/// kullanılır ki bir anahtar yeniden adlandırıldığında derleme kırılsın.
/// </summary>
public static class MessageKeys
{
    // Bildirim metinleri
    public const string NotificationTicketAssigned = "Notification_TicketAssigned";
    public const string NotificationTicketAutoAssigned = "Notification_TicketAutoAssigned";
    public const string NotificationTicketStatusChanged = "Notification_TicketStatusChanged";
    public const string NotificationTicketCommented = "Notification_TicketCommented";
    public const string NotificationSlaBreachReporter = "Notification_SlaBreachReporter";
    public const string NotificationSlaBreachAssignee = "Notification_SlaBreachAssignee";

    // SLA ihlal türü etiketleri
    public const string SlaBreachTypeResponse = "SlaBreachType_Response";
    public const string SlaBreachTypeResolution = "SlaBreachType_Resolution";

    // Atama notları
    public const string AssignmentNoteAutoAssigned = "AssignmentNote_AutoAssigned";

    // E-posta
    public const string EmailNotificationSubject = "Email_NotificationSubject";

    // API hata mesajları
    public const string ErrorCategoryInUse = "Error_CategoryInUse";
    public const string ErrorRuleAssignTargetInvalid = "Error_RuleAssignTargetInvalid";
    public const string ErrorProjectNotFound = "Error_ProjectNotFound";
    public const string ErrorUserNotFound = "Error_UserNotFound";
}

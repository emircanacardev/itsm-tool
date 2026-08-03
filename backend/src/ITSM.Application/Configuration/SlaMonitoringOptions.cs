namespace ITSM.Application.Configuration;

/// <summary>
/// SLA ihlal tarama arka plan servisinin ayarları.
/// appsettings.json'daki "SlaMonitoring" bölümü.
/// </summary>
public class SlaMonitoringOptions
{
    public const string SectionName = "SlaMonitoring";

    /// <summary>
    /// İki tarama arasındaki süre (dakika).
    /// </summary>
    public int CheckIntervalMinutes { get; set; } = 1;
}

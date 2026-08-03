namespace ITSM.Domain.Constants;

/// <summary>
/// Priorities tablosundaki sabit kayıtların Id'leri.
/// PriorityConfiguration.HasData ile seed ediliyor.
/// </summary>
public static class TicketPriorities
{
    public const long Kritik = 10;
    public const long Yuksek = 20;
    public const long Orta = 30;
    public const long Dusuk = 40;
}

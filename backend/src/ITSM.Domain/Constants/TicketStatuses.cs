namespace ITSM.Domain.Constants;

/// <summary>
/// Statuses tablosundaki sabit kayıtların Id'leri.
/// Bu değerler StatusConfiguration.HasData ile seed ediliyor; oradaki Id'ler
/// değişirse burası da değişmeli (ikisi tek kaynaktan beslenmeli).
/// </summary>
public static class TicketStatuses
{
    public const long Acik = 10;
    public const long DevamEdiyor = 20;
    public const long Beklemede = 30;
    public const long Cozuldu = 40;
    public const long Kapatildi = 50;

    /// <summary>
    /// Yeni açılan talebin başlangıç durumu.
    /// </summary>
    public const long Default = Acik;

    /// <summary>
    /// "Kapanmış" sayılan durumlar. SLA takibi, aktif talep sayımı ve iş yükü
    /// hesabı bu listeyi kullanır; buraya yeni bir durum eklendiğinde ilgili
    /// sorgular otomatik olarak doğru davranır.
    /// </summary>
    public static readonly long[] ClosedStates = [Cozuldu, Kapatildi];

    /// <summary>
    /// Henüz kapanmamış, üzerinde çalışılan durumlar.
    /// </summary>
    public static readonly long[] OpenStates = [Acik, DevamEdiyor, Beklemede];
}

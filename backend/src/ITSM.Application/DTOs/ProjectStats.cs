namespace ITSM.Application.DTOs;

/// <summary>
/// Bir projenin kart/detay ekranında gösterilen özet sayaçları.
/// ProjectResponse'a doğrudan yazmak yerine ayrı bir tip: repository
/// bunu tek sorguda üretiyor, servis de ProjectResponse'a kopyalıyor.
/// </summary>
public class ProjectStats
{
    public long ProjectId { get; set; }
    public int TicketCount { get; set; }
    public int OpenTicketCount { get; set; }
    public int OverdueTicketCount { get; set; }
    public int MemberCount { get; set; }
}

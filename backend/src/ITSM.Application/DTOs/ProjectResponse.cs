namespace ITSM.Application.DTOs;

public class ProjectResponse
{
    public long Id { get; set; }
    public required string Name { get; set; }
    public required string Code { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Proje kartlarındaki özet sayaçlar. Tek sorguda alt-sorgu olarak
    // hesaplanıyor (bkz. ProjectRepository.GetStatsAsync) - kart başına
    // ayrı istek atmak N+1 olurdu.
    public int TicketCount { get; set; }
    public int OpenTicketCount { get; set; }
    public int OverdueTicketCount { get; set; }
    public int MemberCount { get; set; }
}
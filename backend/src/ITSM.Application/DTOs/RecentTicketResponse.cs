namespace ITSM.Application.DTOs;

public class RecentTicketResponse
{
    public required long Id { get; set; }
    public required string Title { get; set; }

    // Id'ler de dönülüyor: arayüz renk/rozet mantığını çevrilebilir ada
    // göre değil Id'ye göre kuruyor, böylece dil değişince bozulmuyor.
    public required long StatusId { get; set; }
    public required string StatusName { get; set; }
    public required long PriorityId { get; set; }
    public required string PriorityName { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public required DateTimeOffset CreatedAt { get; set; }
}

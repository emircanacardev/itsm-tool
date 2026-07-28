namespace ITSM.Application.DTOs;

public class CommentResponse
{
    public long Id { get; set; }
    public long TicketId { get; set; }
    public long UserId { get; set; }
    public required string UserFullName { get; set; }
    public required string Message { get; set; }
    public bool IsInternal { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
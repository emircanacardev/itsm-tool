namespace ITSM.Application.DTOs;

public class AttachmentResponse
{
    public long Id { get; set; }
    public long? TicketId { get; set; }
    public required string FileName { get; set; }
    public required string UploadedByFullName { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
}
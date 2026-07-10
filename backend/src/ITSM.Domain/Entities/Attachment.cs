namespace ITSM.Domain.Entities;

public class Attachment
{
    public long Id { get; set; }
    public long? TicketId { get; set; }
    public long? CommentId { get; set; }
    public required string FileName { get; set; }
    public required string FilePath { get; set; }
    public required long UploadedBy { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    public Ticket? Ticket { get; set; }
    public Comment? Comment { get; set; }
    public User UploadedByUser { get; set; } = null!;

    // TODO: "TicketId ya da CommentId'den en az biri dolu olmalı" kuralı
    // burada ifade edilemez - DB'de CHECK constraint (Fluent API) veya
    // Application katmanında servis validasyonu ile uygulanacak.
}

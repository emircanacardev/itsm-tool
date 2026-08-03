namespace ITSM.Application.DTOs;

public class UpdateArticleRequest
{
    public required string Title { get; set; }
    public required string Content { get; set; }

    // Makalenin bağlandığı proje/kategori düzenlemede de değiştirilebilmeli;
    // ikisi de null bırakılırsa makale "genel" hale gelir.
    public long? ProjectId { get; set; }
    public long? CategoryId { get; set; }

    public required bool IsPublished { get; set; }
}
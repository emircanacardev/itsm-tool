namespace ITSM.Application.DTOs;

public class ArticleResponse
{
    public long Id { get; set; }
    public long? ProjectId { get; set; }

    /// <summary>
    /// Makalenin bağlı olduğu projenin adı. Genel (projesiz) makalelerde null.
    /// Liste ekranı etiketi bununla basıyor; her kart için ayrıca proje
    /// çekmek zorunda kalmasın diye yanıta konuldu.
    /// </summary>
    public string? ProjectName { get; set; }

    public long? CategoryId { get; set; }
    public string? CategoryName { get; set; }

    public required string Title { get; set; }
    public required string Content { get; set; }

    /// <summary>
    /// Yazarın kullanıcı id'si. Arayüz "bu makaleyi silebilir miyim?"
    /// kontrolünü bununla yapıyor - isimle karşılaştırma yapılamaz
    /// (aynı adlı iki kullanıcı olabilir, ayrıca ad değişebilir).
    /// </summary>
    public long CreatedBy { get; set; }

    public required string CreatedByFullName { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
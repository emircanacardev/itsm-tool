using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IKnowledgeBaseArticleRepository
{
    Task<KnowledgeBaseArticle?> GetByIdAsync(long id);

    /// <summary>
    /// Makaleleri arar, filtreler, sıralar ve sayfalar. Toplam sayı
    /// sayfalamadan önce alındığı için ayrı döndürülüyor.
    /// </summary>
    /// <param name="canManage">
    /// Yayınlanmamış (taslak) makaleleri de görebilecek mi. false ise
    /// yalnızca yayındakiler ve kullanıcının kendi taslakları döner.
    /// </param>
    Task<(List<KnowledgeBaseArticle> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        long? projectId,
        long? categoryId,
        long userId,
        bool canManage,
        string? sortBy,
        bool sortDescending,
        int page,
        int pageSize);

    /// <summary>
    /// En çok görüntülenen yayındaki makaleler. Panelde "en çok okunanlar"
    /// listesi için; taslaklar dışarıda kalıyor çünkü henüz yayında değiller.
    /// </summary>
    Task<List<KnowledgeBaseArticle>> GetMostViewedAsync(int count);

    /// <summary>
    /// Görüntülenme sayacını bir artırır.
    ///
    /// Entity'yi yükleyip SaveChanges çağırmak yerine doğrudan UPDATE
    /// atılıyor. İki nedenle: (1) SaveChangesAsync her değişiklik için bir
    /// AuditLog satırı yazıyor, sayaç böyle artırılsaydı her makale okuması
    /// bir denetim kaydı üretir ve kayıt gerçek değişiklikler arasında
    /// kaybolurdu; (2) "oku, artır, yaz" iki eşzamanlı okumada birbirini
    /// eziyor, veritabanı tarafında artırmak bunu engelliyor.
    /// </summary>
    Task IncrementViewCountAsync(long id);

    Task AddAsync(KnowledgeBaseArticle article);
    Task UpdateAsync(KnowledgeBaseArticle article);
    Task DeleteAsync(KnowledgeBaseArticle article);
}

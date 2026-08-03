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

    Task AddAsync(KnowledgeBaseArticle article);
    Task UpdateAsync(KnowledgeBaseArticle article);
    Task DeleteAsync(KnowledgeBaseArticle article);
}

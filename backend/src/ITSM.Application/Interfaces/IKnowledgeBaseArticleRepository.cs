using ITSM.Domain.Entities;

namespace ITSM.Application.Interfaces;

public interface IKnowledgeBaseArticleRepository
{
    Task<KnowledgeBaseArticle?> GetByIdAsync(long id);
    Task<List<KnowledgeBaseArticle>> SearchAsync(string? searchTerm, long userId, bool isAdmin);
    Task AddAsync(KnowledgeBaseArticle article);
    Task UpdateAsync(KnowledgeBaseArticle article);
}
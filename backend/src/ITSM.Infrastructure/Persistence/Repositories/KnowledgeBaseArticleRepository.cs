using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using ITSM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ITSM.Infrastructure.Persistence.Repositories;

public class KnowledgeBaseArticleRepository : IKnowledgeBaseArticleRepository
{
    private readonly AppDbContext _context;

    public KnowledgeBaseArticleRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<KnowledgeBaseArticle?> GetByIdAsync(long id)
    {
        return await _context.KnowledgeBaseArticles
            .Include(k => k.CreatedByUser)
            .Include(k => k.Project)
            .Include(k => k.Category)
            .FirstOrDefaultAsync(k => k.Id == id);
    }

    public async Task<(List<KnowledgeBaseArticle> Items, int TotalCount)> SearchAsync(
        string? searchTerm,
        long? projectId,
        long? categoryId,
        long userId,
        bool canManage,
        string? sortBy,
        bool sortDescending,
        int page,
        int pageSize)
    {
        var query = _context.KnowledgeBaseArticles
            .Include(k => k.CreatedByUser)
            .Include(k => k.Project)
            .Include(k => k.Category)
            .AsQueryable();

        // Taslaklar herkese açık değil: yalnızca bilgi bankası yetkisi olanlar
        // ve makalenin kendi yazarı görebiliyor.
        if (!canManage)
        {
            query = query.Where(k => k.IsPublished || k.CreatedBy == userId);
        }

        if (projectId is not null)
        {
            query = query.Where(k => k.ProjectId == projectId);
        }

        if (categoryId is not null)
        {
            query = query.Where(k => k.CategoryId == categoryId);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            query = query.Where(k =>
                EF.Functions.ILike(k.Title, $"%{searchTerm}%") ||
                EF.Functions.ILike(k.Content, $"%{searchTerm}%"));
        }

        // Toplam sayı sayfalamadan önce alınıyor; Skip/Take'ten sonra
        // sayılsaydı yalnızca o sayfadaki satırları sayardı.
        var totalCount = await query.CountAsync();

        // Açık bir ORDER BY olmadan Postgres sıralama garantisi vermiyor.
        // Varsayılan "en son güncellenen üstte": bilgi bankasında en taze
        // dokümanın önce görünmesi bekleniyor.
        query = sortBy?.ToLowerInvariant() switch
        {
            "title" => sortDescending ? query.OrderByDescending(k => k.Title) : query.OrderBy(k => k.Title),
            "createdat" => sortDescending ? query.OrderByDescending(k => k.CreatedAt) : query.OrderBy(k => k.CreatedAt),
            "projectname" => sortDescending
                ? query.OrderByDescending(k => k.Project != null ? k.Project.Name : null)
                : query.OrderBy(k => k.Project != null ? k.Project.Name : null),
            "createdbyfullname" => sortDescending
                ? query.OrderByDescending(k => k.CreatedByUser.FullName)
                : query.OrderBy(k => k.CreatedByUser.FullName),
            _ => sortDescending ? query.OrderByDescending(k => k.UpdatedAt) : query.OrderBy(k => k.UpdatedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task AddAsync(KnowledgeBaseArticle article)
    {
        _context.KnowledgeBaseArticles.Add(article);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(KnowledgeBaseArticle article)
    {
        _context.KnowledgeBaseArticles.Update(article);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(KnowledgeBaseArticle article)
    {
        _context.KnowledgeBaseArticles.Remove(article);
        await _context.SaveChangesAsync();
    }
}
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
            .FirstOrDefaultAsync(k => k.Id == id);
    }

    public async Task<List<KnowledgeBaseArticle>> SearchAsync(string? searchTerm, long userId, bool isAdmin)
    {
        var query = _context.KnowledgeBaseArticles
            .Include(k => k.CreatedByUser)
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(k => k.IsPublished || k.CreatedBy == userId);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            query = query.Where(k =>
                EF.Functions.ILike(k.Title, $"%{searchTerm}%") ||
                EF.Functions.ILike(k.Content, $"%{searchTerm}%"));
        }

        return await query.OrderByDescending(k => k.UpdatedAt).ToListAsync();
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
}
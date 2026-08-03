using ITSM.Application.DTOs;
using ITSM.Domain.Constants;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class KnowledgeBaseArticleService
{
    private readonly IKnowledgeBaseArticleRepository _articleRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;

    public KnowledgeBaseArticleService(
        IKnowledgeBaseArticleRepository articleRepository,
        IUserPermissionRepository userPermissionRepository)
    {
        _articleRepository = articleRepository;
        _userPermissionRepository = userPermissionRepository;
    }

    public async Task<ArticleResponse> CreateArticleAsync(CreateArticleRequest request, long createdByUserId)
    {
        var article = new KnowledgeBaseArticle
        {
            ProjectId = request.ProjectId,
            CategoryId = request.CategoryId,
            Title = request.Title,
            Content = request.Content,
            CreatedBy = createdByUserId,
            IsPublished = request.IsPublished
        };

        await _articleRepository.AddAsync(article);

        var created = await _articleRepository.GetByIdAsync(article.Id);
        return MapToResponse(created!);
    }

    public async Task<List<ArticleResponse>> SearchArticlesAsync(string? searchTerm, long userId)
    {
        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);
        var articles = await _articleRepository.SearchAsync(searchTerm, userId, isAdmin);
        return articles.Select(MapToResponse).ToList();
    }

    public async Task<ArticleResponse?> GetArticleByIdAsync(long id, long userId)
    {
        var article = await _articleRepository.GetByIdAsync(id);
        if (article is null)
        {
            return null;
        }

        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);
        var isOwner = article.CreatedBy == userId;

        if (!article.IsPublished && !isAdmin && !isOwner)
        {
            return null;
        }

        return MapToResponse(article);
    }

    public async Task<bool> UpdateArticleAsync(long id, UpdateArticleRequest request)
    {
        var article = await _articleRepository.GetByIdAsync(id);
        if (article is null)
        {
            return false;
        }

        article.Title = request.Title;
        article.Content = request.Content;
        article.IsPublished = request.IsPublished;
        article.UpdatedAt = DateTimeOffset.UtcNow;

        await _articleRepository.UpdateAsync(article);
        return true;
    }

    private static ArticleResponse MapToResponse(KnowledgeBaseArticle article)
    {
        return new ArticleResponse
        {
            Id = article.Id,
            ProjectId = article.ProjectId,
            CategoryId = article.CategoryId,
            Title = article.Title,
            Content = article.Content,
            CreatedByFullName = article.CreatedByUser.FullName,
            IsPublished = article.IsPublished,
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt
        };
    }
}
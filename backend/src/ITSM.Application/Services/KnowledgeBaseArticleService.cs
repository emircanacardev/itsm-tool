using ITSM.Application.Configuration;
using ITSM.Application.DTOs;
using ITSM.Domain.Constants;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;
using Microsoft.Extensions.Options;

namespace ITSM.Application.Services;

public class KnowledgeBaseArticleService
{
    private readonly IKnowledgeBaseArticleRepository _articleRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly PaginationOptions _paginationOptions;

    public KnowledgeBaseArticleService(
        IKnowledgeBaseArticleRepository articleRepository,
        IUserPermissionRepository userPermissionRepository,
        IOptions<PaginationOptions> paginationOptions)
    {
        _articleRepository = articleRepository;
        _userPermissionRepository = userPermissionRepository;
        _paginationOptions = paginationOptions.Value;
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

    public async Task<PagedResult<ArticleResponse>> SearchArticlesAsync(ArticleFilterRequest filter, long userId)
    {
        var canManage = await CanManageKnowledgeBaseAsync(userId);

        var page = _paginationOptions.NormalizePage(filter.Page);
        var pageSize = _paginationOptions.NormalizePageSize(filter.PageSize);

        var (articles, totalCount) = await _articleRepository.SearchAsync(
            filter.Search,
            filter.ProjectId,
            filter.CategoryId,
            userId,
            canManage,
            filter.SortBy,
            filter.SortDescending,
            page,
            pageSize);

        return new PagedResult<ArticleResponse>
        {
            Items = articles.Select(MapToResponse).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ArticleResponse?> GetArticleByIdAsync(long id, long userId)
    {
        var article = await _articleRepository.GetByIdAsync(id);
        if (article is null)
        {
            return null;
        }

        // Yayınlanmamış makale yalnızca yetkiliye ve yazarına görünür.
        // Yetkisiz erişimde 403 değil 404 dönüyoruz (bkz. görünürlük filtresi
        // kararı) - taslağın varlığını sızdırmamak için.
        if (!article.IsPublished && !await CanEditAsync(article, userId))
        {
            return null;
        }

        // Görüntülenme yalnızca yayındaki makalede ve okuyan yazarın kendisi
        // değilken sayılıyor: yazarın taslağını düzenlerken açması "okundu"
        // değil, kendi sayacını şişirmesi olurdu.
        if (article.IsPublished && article.CreatedBy != userId)
        {
            await _articleRepository.IncrementViewCountAsync(article.Id);
            // Bellekteki nesne artırımdan habersiz; yanıtın güncel sayıyı
            // göstermesi için elle eşitliyoruz (tekrar sorgu atmaya değmez).
            article.ViewCount++;
        }

        return MapToResponse(article);
    }

    /// <summary>
    /// Panelde gösterilen "en çok okunan makaleler" listesi.
    /// </summary>
    public async Task<List<ArticleResponse>> GetMostViewedArticlesAsync(int count)
    {
        var articles = await _articleRepository.GetMostViewedAsync(count);
        return articles.Select(MapToResponse).ToList();
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
        article.ProjectId = request.ProjectId;
        article.CategoryId = request.CategoryId;
        article.IsPublished = request.IsPublished;
        article.UpdatedAt = DateTimeOffset.UtcNow;

        await _articleRepository.UpdateAsync(article);
        return true;
    }

    /// <summary>
    /// Makaleyi siler. Silme yetkisi KB_MANAGE'e ya da makalenin yazarı
    /// olmaya bağlı: kendi taslağını silmek yazarın kendi işidir.
    /// Yetkisiz istekte de false dönüyor, böylece controller 404 veriyor ve
    /// makalenin var olup olmadığı sızmıyor.
    /// </summary>
    public async Task<bool> DeleteArticleAsync(long id, long userId)
    {
        var article = await _articleRepository.GetByIdAsync(id);
        if (article is null)
        {
            return false;
        }

        if (!await CanEditAsync(article, userId))
        {
            return false;
        }

        await _articleRepository.DeleteAsync(article);
        return true;
    }

    /// <summary>
    /// Bilgi bankası yönetim yetkisi. ADMIN_MANAGE'i olan kullanıcı
    /// PermissionAuthorizationHandler tarafından zaten muaf tutuluyor, ama bu
    /// kontrol handler'dan bağımsız çalıştığı için burada ayrıca sorulmalı.
    /// </summary>
    private async Task<bool> CanManageKnowledgeBaseAsync(long userId)
    {
        return await _userPermissionRepository.HasPermissionAsync(userId, Permissions.KnowledgeBaseManage, null)
            || await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);
    }

    private async Task<bool> CanEditAsync(KnowledgeBaseArticle article, long userId)
    {
        return article.CreatedBy == userId || await CanManageKnowledgeBaseAsync(userId);
    }

    private static ArticleResponse MapToResponse(KnowledgeBaseArticle article)
    {
        return new ArticleResponse
        {
            Id = article.Id,
            ProjectId = article.ProjectId,
            ProjectName = article.Project?.Name,
            CategoryId = article.CategoryId,
            CategoryName = article.Category?.Name,
            Title = article.Title,
            Content = article.Content,
            CreatedBy = article.CreatedBy,
            CreatedByFullName = article.CreatedByUser.FullName,
            IsPublished = article.IsPublished,
            ViewCount = article.ViewCount,
            CreatedAt = article.CreatedAt,
            UpdatedAt = article.UpdatedAt
        };
    }
}
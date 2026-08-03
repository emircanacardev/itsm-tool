using ITSM.Application.DTOs;
using ITSM.API.Extensions;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class KnowledgeBaseArticleController : ControllerBase
{
    private readonly KnowledgeBaseArticleService _articleService;

    public KnowledgeBaseArticleController(KnowledgeBaseArticleService articleService)
    {
        _articleService = articleService;
    }

    [HttpPost]
    [Authorize(Policy = Permissions.KnowledgeBaseManage)]
    public async Task<IActionResult> CreateArticle(CreateArticleRequest request)
    {
        var userId = User.GetUserId();

        var result = await _articleService.CreateArticleAsync(request, userId);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> SearchArticles([FromQuery] ArticleFilterRequest filter)
    {
        var userId = User.GetUserId();

        var result = await _articleService.SearchArticlesAsync(filter, userId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetArticleById(long id)
    {
        var userId = User.GetUserId();

        var result = await _articleService.GetArticleByIdAsync(id, userId);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Permissions.KnowledgeBaseManage)]
    public async Task<IActionResult> UpdateArticle(long id, UpdateArticleRequest request)
    {
        var success = await _articleService.UpdateArticleAsync(id, request);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }

    // Silme, POST/PUT'un aksine policy ile korunmuyor: yetki kontrolü servise
    // indi, çünkü KB_MANAGE'i olmayan bir kullanıcı da kendi taslağını
    // silebilmeli. Yetkisiz istek 403 değil 404 alır.
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteArticle(long id)
    {
        var userId = User.GetUserId();

        var success = await _articleService.DeleteArticleAsync(id, userId);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
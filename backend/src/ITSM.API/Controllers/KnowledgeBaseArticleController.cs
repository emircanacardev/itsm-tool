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
    [Authorize(Policy = Permissions.AdminManage)]
    public async Task<IActionResult> CreateArticle(CreateArticleRequest request)
    {
        var userId = User.GetUserId();

        var result = await _articleService.CreateArticleAsync(request, userId);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> SearchArticles([FromQuery] string? search)
    {
        var userId = User.GetUserId();

        var result = await _articleService.SearchArticlesAsync(search, userId);
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
    [Authorize(Policy = Permissions.AdminManage)]
    public async Task<IActionResult> UpdateArticle(long id, UpdateArticleRequest request)
    {
        var success = await _articleService.UpdateArticleAsync(id, request);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
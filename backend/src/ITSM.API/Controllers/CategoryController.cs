using ITSM.Application;
using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using ITSM.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ITSM.API.Controllers;

[ApiController]
[Route("api/project/{projectId}/categories")]
[Authorize]
public class CategoryController : ControllerBase
{
    private readonly CategoryService _categoryService;
    private readonly ILocalizedMessageProvider _messageProvider;

    public CategoryController(CategoryService categoryService, ILocalizedMessageProvider messageProvider)
    {
        _categoryService = categoryService;
        _messageProvider = messageProvider;
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ProjectManage)]
    public async Task<IActionResult> CreateCategory(long projectId, CreateCategoryRequest request)
    {
        var result = await _categoryService.CreateCategoryAsync(projectId, request);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetCategoriesByProject(long projectId)
    {
        var result = await _categoryService.GetCategoriesByProjectAsync(projectId);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategoryById(long projectId, long id)
    {
        var result = await _categoryService.GetCategoryByIdAsync(projectId, id);
        if (result is null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Permissions.ProjectManage)]
    public async Task<IActionResult> UpdateCategory(long projectId, long id, UpdateCategoryRequest request)
    {
        var success = await _categoryService.UpdateCategoryAsync(projectId, id, request);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Permissions.ProjectManage)]
    public async Task<IActionResult> DeleteCategory(long projectId, long id)
    {
        var result = await _categoryService.DeleteCategoryAsync(projectId, id);
        return result switch
        {
            DeleteCategoryResult.NotFound => NotFound(),
            DeleteCategoryResult.InUse => Conflict(_messageProvider.Get(MessageKeys.ErrorCategoryInUse)),
            _ => NoContent()
        };
    }
}
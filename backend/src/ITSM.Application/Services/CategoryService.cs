using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class CategoryService
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IProjectRepository _projectRepository;

    public CategoryService(ICategoryRepository categoryRepository, IProjectRepository projectRepository)
    {
        _categoryRepository = categoryRepository;
        _projectRepository = projectRepository;
    }

    public async Task<CategoryResponse?> CreateCategoryAsync(long projectId, CreateCategoryRequest request)
    {
        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null)
        {
            return null;
        }

        var category = new Category
        {
            ProjectId = projectId,
            Name = request.Name,
            Description = request.Description
        };

        await _categoryRepository.AddAsync(category);

        return MapToResponse(category);
    }

    public async Task<List<CategoryResponse>> GetCategoriesByProjectAsync(long projectId)
    {
        var categories = await _categoryRepository.GetAllByProjectIdAsync(projectId);
        return categories.Select(MapToResponse).ToList();
    }

    public async Task<CategoryResponse?> GetCategoryByIdAsync(long projectId, long id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category is null || category.ProjectId != projectId)
        {
            return null;
        }
        return MapToResponse(category);
    }

    public async Task<bool> UpdateCategoryAsync(long projectId, long id, UpdateCategoryRequest request)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category is null || category.ProjectId != projectId)
        {
            return false;
        }

        category.Name = request.Name;
        category.Description = request.Description;

        await _categoryRepository.UpdateAsync(category);
        return true;
    }

    private static CategoryResponse MapToResponse(Category category)
    {
        return new CategoryResponse
        {
            Id = category.Id,
            ProjectId = category.ProjectId,
            Name = category.Name,
            Description = category.Description
        };
    }
}
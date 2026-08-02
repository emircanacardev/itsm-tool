using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class CategoryService
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly ITicketRepository _ticketRepository;

    public CategoryService(
        ICategoryRepository categoryRepository,
        IProjectRepository projectRepository,
        ITicketRepository ticketRepository)
    {
        _categoryRepository = categoryRepository;
        _projectRepository = projectRepository;
        _ticketRepository = ticketRepository;
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

    // Ticket.CategoryId FK'si Restrict (bkz. TicketConfiguration), yani
    // kategoriye bağlı ticket varken silmeye çalışırsak veritabanı hatası
    // alırdık. Application katmanı EF Core'a bağımlı olmadığı için
    // (ITSM.Application.csproj sadece Domain'e referans veriyor)
    // DbUpdateException yakalamak yerine önce ExistsByCategoryIdAsync ile
    // kontrol edip anlamlı bir sonuç (InUse) dönüyoruz.
    public async Task<DeleteCategoryResult> DeleteCategoryAsync(long projectId, long id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category is null || category.ProjectId != projectId)
        {
            return DeleteCategoryResult.NotFound;
        }

        var hasTickets = await _ticketRepository.ExistsByCategoryIdAsync(id);
        if (hasTickets)
        {
            return DeleteCategoryResult.InUse;
        }

        await _categoryRepository.DeleteAsync(category);
        return DeleteCategoryResult.Success;
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
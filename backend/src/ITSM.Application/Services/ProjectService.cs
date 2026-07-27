using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class ProjectService
{
    private readonly IProjectRepository _projectRepository;

    public ProjectService(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<ProjectResponse?> CreateProjectAsync(CreateProjectRequest request)
    {
        var existingProject = await _projectRepository.GetByCodeAsync(request.Code);
        if (existingProject is not null)
        {
            return null;
        }

        var project = new Project
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description
        };

        await _projectRepository.AddAsync(project);

        return MapToResponse(project);
    }

    public async Task<List<ProjectResponse>> GetAllProjectsAsync()
    {
        var projects = await _projectRepository.GetAllAsync();
        return projects.Select(MapToResponse).ToList();
    }

    public async Task<ProjectResponse?> GetProjectByIdAsync(long id)
    {
        var project = await _projectRepository.GetByIdAsync(id);
        if (project is null)
        {
            return null;
        }
        return MapToResponse(project);
    }

    public async Task<bool> UpdateProjectAsync(long id, UpdateProjectRequest request)
    {
        var project = await _projectRepository.GetByIdAsync(id);
        if (project is null)
        {
            return false;
        }

        project.Name = request.Name;
        project.Description = request.Description;
        project.IsActive = request.IsActive;

        await _projectRepository.UpdateAsync(project);
        return true;
    }

    private static ProjectResponse MapToResponse(Project project)
    {
        return new ProjectResponse
        {
            Id = project.Id,
            Name = project.Name,
            Code = project.Code,
            Description = project.Description,
            IsActive = project.IsActive,
            CreatedAt = project.CreatedAt
        };
    }
}
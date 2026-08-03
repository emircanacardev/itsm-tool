using ITSM.Application.DTOs;
using ITSM.Domain.Constants;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class ProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly IProjectMemberRepository _projectMemberRepository;

    public ProjectService(
        IProjectRepository projectRepository,
        IUserPermissionRepository userPermissionRepository,
        IProjectMemberRepository projectMemberRepository)
    {
        _projectRepository = projectRepository;
        _userPermissionRepository = userPermissionRepository;
        _projectMemberRepository = projectMemberRepository;
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

    public async Task<List<ProjectResponse>> GetAllProjectsAsync(long userId)
    {
        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);

        var projects = isAdmin
            ? await _projectRepository.GetAllAsync()
            : await _projectRepository.GetAllForUserAsync(userId);

        return projects.Select(MapToResponse).ToList();
    }

    // Admin panelindeki proje listesi büyüyebileceği için (bkz. kullanıcı
    // arama endpoint'indeki aynı gerekçe) ayrı bir sayfalanmış yol - mevcut
    // GetAllProjectsAsync'i (dropdown'lar, ticket oluşturma vb. çağırıyor)
    // değiştirmeden, sadece sayfa istenince kullanılıyor.
    public async Task<PagedResult<ProjectResponse>> GetAllProjectsPagedAsync(long userId, string? search, string? sortBy, bool sortDescending, int page, int pageSize)
    {
        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);

        if (isAdmin)
        {
            var (items, totalCount) = await _projectRepository.GetAllPagedAsync(search, sortBy, sortDescending, page, pageSize);
            return new PagedResult<ProjectResponse>
            {
                Items = items.Select(MapToResponse).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        // Admin olmayan bir kullanıcı zaten admin panelini görmüyor, ama
        // endpoint genel [Authorize] olduğu için burada da tutarlı bir
        // sonuç dönmek adına üye olduğu projeleri bellekte filtreleyip sıralıyoruz.
        var allForUser = await _projectRepository.GetAllForUserAsync(userId);

        IEnumerable<Project> filtered = allForUser;
        if (!string.IsNullOrWhiteSpace(search))
        {
            filtered = filtered.Where(p =>
                p.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                p.Code.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (p.Description is not null && p.Description.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        filtered = sortBy?.ToLowerInvariant() switch
        {
            "code" => sortDescending ? filtered.OrderByDescending(p => p.Code) : filtered.OrderBy(p => p.Code),
            "description" => sortDescending ? filtered.OrderByDescending(p => p.Description) : filtered.OrderBy(p => p.Description),
            "status" => sortDescending ? filtered.OrderByDescending(p => p.IsActive) : filtered.OrderBy(p => p.IsActive),
            "createdat" => sortDescending ? filtered.OrderByDescending(p => p.CreatedAt) : filtered.OrderBy(p => p.CreatedAt),
            _ => sortDescending ? filtered.OrderByDescending(p => p.Name) : filtered.OrderBy(p => p.Name)
        };

        var filteredList = filtered.ToList();
        var pagedForUser = filteredList.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new PagedResult<ProjectResponse>
        {
            Items = pagedForUser.Select(MapToResponse).ToList(),
            TotalCount = filteredList.Count,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ProjectResponse?> GetProjectByIdAsync(long id, long userId)
    {
        var project = await _projectRepository.GetByIdAsync(id);
        if (project is null)
        {
            return null;
        }

        var isAdmin = await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null);
        if (isAdmin)
        {
            return MapToResponse(project);
        }

        var isMember = await _projectMemberRepository.GetByProjectAndUserAsync(id, userId) is not null;
        if (!isMember)
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
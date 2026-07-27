using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class ProjectMemberService
{
    private readonly IProjectMemberRepository _projectMemberRepository;
    private readonly IProjectRepository _projectRepository;
    private readonly IUserRepository _userRepository;

    public ProjectMemberService(
        IProjectMemberRepository projectMemberRepository,
        IProjectRepository projectRepository,
        IUserRepository userRepository)
    {
        _projectMemberRepository = projectMemberRepository;
        _projectRepository = projectRepository;
        _userRepository = userRepository;
    }

    public async Task<(AddMemberResult Result, ProjectMemberResponse? Member)> AddMemberAsync(long projectId, AddProjectMemberRequest request)
    {
        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null)
        {
            return (AddMemberResult.ProjectNotFound, null);
        }

        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user is null)
        {
            return (AddMemberResult.UserNotFound, null);
        }

        var existingMember = await _projectMemberRepository.GetByProjectAndUserAsync(projectId, request.UserId);
        if (existingMember is not null)
        {
            return (AddMemberResult.AlreadyMember, null);
        }

        var member = new ProjectMember
        {
            ProjectId = projectId,
            UserId = request.UserId
        };

        await _projectMemberRepository.AddAsync(member);

        return (AddMemberResult.Success, MapToResponse(member, user));
    }

    public async Task<List<ProjectMemberResponse>?> GetMembersByProjectAsync(long projectId)
    {
        var project = await _projectRepository.GetByIdAsync(projectId);
        if (project is null)
        {
            return null;
        }

        var members = await _projectMemberRepository.GetAllByProjectIdAsync(projectId);
        return members.Select(m => MapToResponse(m, m.User)).ToList();
    }

    public async Task<bool> RemoveMemberAsync(long projectId, long memberId)
    {
        var member = await _projectMemberRepository.GetByIdAsync(memberId);
        if (member is null || member.ProjectId != projectId)
        {
            return false;
        }

        await _projectMemberRepository.DeleteAsync(member);
        return true;
    }

    private static ProjectMemberResponse MapToResponse(ProjectMember member, User user)
    {
        return new ProjectMemberResponse
        {
            Id = member.Id,
            ProjectId = member.ProjectId,
            UserId = member.UserId,
            UserFullName = user.FullName,
            UserEmail = user.Email
        };
    }
}
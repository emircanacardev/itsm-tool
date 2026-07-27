using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class GroupService
{
    private readonly IGroupRepository _groupRepository;

    public GroupService(IGroupRepository groupRepository)
    {
        _groupRepository = groupRepository;
    }

    public async Task<GroupResponse> CreateGroupAsync(CreateGroupRequest request)
    {
        var group = new Group
        {
            Name = request.Name,
            Description = request.Description
        };

        await _groupRepository.AddAsync(group);

        return MapToResponse(group);
    }

    public async Task<List<GroupResponse>> GetAllGroupsAsync()
    {
        var groups = await _groupRepository.GetAllAsync();
        return groups.Select(MapToResponse).ToList();
    }

    public async Task<GroupResponse?> GetGroupByIdAsync(long id)
    {
        var group = await _groupRepository.GetByIdAsync(id);
        if (group is null)
        {
            return null;
        }
        return MapToResponse(group);
    }

    public async Task<bool> UpdateGroupAsync(long id, UpdateGroupRequest request)
    {
        var group = await _groupRepository.GetByIdAsync(id);
        if (group is null)
        {
            return false;
        }

        group.Name = request.Name;
        group.Description = request.Description;

        await _groupRepository.UpdateAsync(group);
        return true;
    }

    private static GroupResponse MapToResponse(Group group)
    {
        return new GroupResponse
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            CreatedAt = group.CreatedAt
        };
    }
}
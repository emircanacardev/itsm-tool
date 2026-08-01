using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class UserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<List<UserResponse>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Select(MapToResponse).ToList();
    }

    public async Task<UserResponse?> GetUserByIdAsync(long id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        return user is null ? null : MapToResponse(user);
    }

    public async Task<bool> UpdateUserStatusAsync(long id, bool isActive)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
        {
            return false;
        }

        user.IsActive = isActive;
        await _userRepository.UpdateAsync(user);
        return true;
    }

    public async Task<List<AssignableUserResponse>> GetAssignableUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users
            .Where(u => u.IsActive)
            .Select(u => new AssignableUserResponse { Id = u.Id, FullName = u.FullName })
            .ToList();
    }

    public async Task<bool> UpdateUserGroupAsync(long id, long groupId)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
        {
            return false;
        }

        user.GroupId = groupId;
        await _userRepository.UpdateAsync(user);
        return true;
    }

    private static UserResponse MapToResponse(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            GroupId = user.GroupId,
            GroupName = user.Group.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}

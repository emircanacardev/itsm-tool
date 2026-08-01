using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class AuthService
{
    // Kayıt olan kullanıcılar, admin panelden gerçek departmana taşınana kadar bu gruba düşer.
    // Bkz: database/scripts/seed/001_seed_reference_data.sql
    private const string DefaultGroupName = "Atanmamış";

    private readonly IUserRepository _userRepository;
    private readonly IGroupRepository _groupRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly PermissionService _permissionService;

    public AuthService(
        IUserRepository userRepository,
        IGroupRepository groupRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        PermissionService permissionService)
    {
        _userRepository = userRepository;
        _groupRepository = groupRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _permissionService = permissionService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user is null)
        {
            return null;
        }

        var passwordValid = _passwordHasher.Verify(request.Password, user.PasswordHash);
        if (!passwordValid)
        {
            return null;
        }

        if (!user.IsActive)
        {
            return null;
        }

        var token = _jwtTokenGenerator.GenerateToken(user);
        return new LoginResponse { Token = token };
    }

    public async Task<LoginResponse?> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await _userRepository.GetByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            return null;
        }

        var defaultGroup = await _groupRepository.GetByNameAsync(DefaultGroupName);
        if (defaultGroup is null)
        {
            // "Atanmamış" grubu DB'de yoksa kayıt yapılamaz.
            // Bkz: database/scripts/seed/001_seed_reference_data.sql
            return null;
        }

        var user = new User
        {
            GroupId = defaultGroup.Id,
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = _passwordHasher.Hash(request.Password)
        };

        await _userRepository.AddAsync(user);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponse { Token = token };
    }

    public async Task<CurrentUserResponse?> GetCurrentUserAsync(long userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            return null;
        }

        var permissions = await _permissionService.GetUserPermissionsAsync(userId);
        var isAdmin = permissions.Any(p => p.PermissionCode == "ADMIN_MANAGE");

        return new CurrentUserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            GroupId = user.GroupId,
            IsAdmin = isAdmin,
            Permissions = permissions
        };
    }
}
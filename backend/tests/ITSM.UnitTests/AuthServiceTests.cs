using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Application.Services;
using ITSM.Domain.Entities;
using Moq;

namespace ITSM.UnitTests;

public class AuthServiceTests
{
    private const string DefaultGroupName = "Atanmamış";

    private readonly Mock<IUserRepository> _userRepository = new();
    private readonly Mock<IGroupRepository> _groupRepository = new();
    private readonly Mock<IPasswordHasher> _passwordHasher = new();
    private readonly Mock<IJwtTokenGenerator> _jwtTokenGenerator = new();
    private readonly Mock<IUserPermissionRepository> _userPermissionRepository = new();
    private readonly Mock<IPermissionRepository> _permissionRepository = new();
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        // PermissionService'in metodları virtual değil, Moq onu mock'layamıyor -
        // bu yüzden gerçek PermissionService'i kendi (mock'lanmış) repository'siyle
        // kuruyoruz. Sadece asıl dış sınır olan repository'ler mock'lanıyor.
        var permissionService = new PermissionService(_userPermissionRepository.Object, _permissionRepository.Object);
        _service = new AuthService(
            _userRepository.Object,
            _groupRepository.Object,
            _passwordHasher.Object,
            _jwtTokenGenerator.Object,
            permissionService);
    }

    private static User CreateUser(bool isActive = true) => new()
    {
        Id = 1,
        GroupId = 5,
        Group = new Group { Id = 5, Name = "Test Grubu" },
        FullName = "Test Kullanıcı",
        Email = "test@turkcell.com.tr",
        PasswordHash = "hashed-password",
        IsActive = isActive
    };

    [Fact]
    public async Task LoginAsync_WhenUserNotFound_ReturnsNull()
    {
        _userRepository.Setup(r => r.GetByEmailAsync("test@turkcell.com.tr")).ReturnsAsync((User?)null);

        var result = await _service.LoginAsync(new LoginRequest { Email = "test@turkcell.com.tr", Password = "1234" });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordInvalid_ReturnsNull()
    {
        var user = CreateUser();
        _userRepository.Setup(r => r.GetByEmailAsync(user.Email)).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("wrong-password", user.PasswordHash)).Returns(false);

        var result = await _service.LoginAsync(new LoginRequest { Email = user.Email, Password = "wrong-password" });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_WhenUserIsInactive_ReturnsNull()
    {
        var user = CreateUser(isActive: false);
        _userRepository.Setup(r => r.GetByEmailAsync(user.Email)).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("1234", user.PasswordHash)).Returns(true);

        var result = await _service.LoginAsync(new LoginRequest { Email = user.Email, Password = "1234" });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_WhenCredentialsAreValid_ReturnsToken()
    {
        var user = CreateUser();
        _userRepository.Setup(r => r.GetByEmailAsync(user.Email)).ReturnsAsync(user);
        _passwordHasher.Setup(h => h.Verify("1234", user.PasswordHash)).Returns(true);
        _jwtTokenGenerator.Setup(j => j.GenerateToken(user)).Returns("fake-jwt-token");

        var result = await _service.LoginAsync(new LoginRequest { Email = user.Email, Password = "1234" });

        Assert.NotNull(result);
        Assert.Equal("fake-jwt-token", result!.Token);
    }

    [Fact]
    public async Task RegisterAsync_WhenEmailAlreadyRegistered_ReturnsNull()
    {
        var existing = CreateUser();
        _userRepository.Setup(r => r.GetByEmailAsync(existing.Email)).ReturnsAsync(existing);

        var request = new RegisterRequest
        {
            Email = existing.Email,
            Password = "1234",
            FullName = "Yeni Kullanıcı"
        };

        var result = await _service.RegisterAsync(request);

        Assert.Null(result);
        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_WhenDefaultGroupMissing_ReturnsNull()
    {
        _userRepository.Setup(r => r.GetByEmailAsync("yeni@turkcell.com.tr")).ReturnsAsync((User?)null);
        _groupRepository.Setup(g => g.GetByNameAsync(DefaultGroupName)).ReturnsAsync((Group?)null);

        var request = new RegisterRequest
        {
            Email = "yeni@turkcell.com.tr",
            Password = "1234",
            FullName = "Yeni Kullanıcı"
        };

        var result = await _service.RegisterAsync(request);

        Assert.Null(result);
        _userRepository.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task RegisterAsync_WhenEmailIsNew_CreatesUserAndReturnsToken()
    {
        var defaultGroup = new Group { Id = 1, Name = DefaultGroupName };
        _userRepository.Setup(r => r.GetByEmailAsync("yeni@turkcell.com.tr")).ReturnsAsync((User?)null);
        _groupRepository.Setup(g => g.GetByNameAsync(DefaultGroupName)).ReturnsAsync(defaultGroup);
        _passwordHasher.Setup(h => h.Hash("1234")).Returns("hashed-1234");
        _jwtTokenGenerator.Setup(j => j.GenerateToken(It.IsAny<User>())).Returns("fake-jwt-token");

        var request = new RegisterRequest
        {
            Email = "yeni@turkcell.com.tr",
            Password = "1234",
            FullName = "Yeni Kullanıcı"
        };

        var result = await _service.RegisterAsync(request);

        Assert.NotNull(result);
        Assert.Equal("fake-jwt-token", result!.Token);
        _userRepository.Verify(r => r.AddAsync(It.Is<User>(u =>
            u.Email == "yeni@turkcell.com.tr" &&
            u.GroupId == defaultGroup.Id &&
            u.PasswordHash == "hashed-1234")), Times.Once);
    }

    [Fact]
    public async Task GetCurrentUserAsync_WhenUserNotFound_ReturnsNull()
    {
        _userRepository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);

        var result = await _service.GetCurrentUserAsync(99);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetCurrentUserAsync_WhenUserHasAdminPermission_SetsIsAdminTrue()
    {
        var user = CreateUser();
        _userRepository.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        _userPermissionRepository.Setup(r => r.GetByUserIdAsync(user.Id)).ReturnsAsync(new List<UserPermission>
        {
            new()
            {
                Id = 1,
                UserId = user.Id,
                PermissionId = 1,
                Permission = new Permission { Id = 1, Code = "ADMIN_MANAGE", Name = "Yönetim" }
            }
        });

        var result = await _service.GetCurrentUserAsync(user.Id);

        Assert.NotNull(result);
        Assert.True(result!.IsAdmin);
    }

    [Fact]
    public async Task GetCurrentUserAsync_WhenUserHasNoAdminPermission_SetsIsAdminFalse()
    {
        var user = CreateUser();
        _userRepository.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        _userPermissionRepository.Setup(r => r.GetByUserIdAsync(user.Id)).ReturnsAsync(new List<UserPermission>
        {
            new()
            {
                Id = 1,
                UserId = user.Id,
                PermissionId = 2,
                Permission = new Permission { Id = 2, Code = "TICKET_CREATE", Name = "Talep Oluştur" }
            }
        });

        var result = await _service.GetCurrentUserAsync(user.Id);

        Assert.NotNull(result);
        Assert.False(result!.IsAdmin);
    }
}

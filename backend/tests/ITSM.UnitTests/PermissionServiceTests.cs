using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Application.Services;
using ITSM.Domain.Entities;
using Moq;

namespace ITSM.UnitTests;

public class PermissionServiceTests
{
    private readonly Mock<IUserPermissionRepository> _userPermissionRepository = new();
    private readonly Mock<IPermissionRepository> _permissionRepository = new();
    private readonly PermissionService _service;

    public PermissionServiceTests()
    {
        _service = new PermissionService(_userPermissionRepository.Object, _permissionRepository.Object);
    }

    [Fact]
    public async Task GrantPermissionAsync_PassesCorrectUserPermissionToRepository()
    {
        var request = new GrantPermissionRequest { PermissionId = 7, ProjectId = 3 };

        await _service.GrantPermissionAsync(userId: 42, request);

        _userPermissionRepository.Verify(r => r.GrantAsync(It.Is<UserPermission>(up =>
            up.UserId == 42 && up.PermissionId == 7 && up.ProjectId == 3)), Times.Once);
    }

    [Fact]
    public async Task GrantPermissionAsync_WithNoProject_PassesNullProjectId()
    {
        var request = new GrantPermissionRequest { PermissionId = 7, ProjectId = null };

        await _service.GrantPermissionAsync(userId: 42, request);

        _userPermissionRepository.Verify(r => r.GrantAsync(It.Is<UserPermission>(up =>
            up.UserId == 42 && up.PermissionId == 7 && up.ProjectId == null)), Times.Once);
    }

    [Fact]
    public async Task GetUserPermissionsAsync_MapsEntitiesToResponseDtos()
    {
        var permissions = new List<UserPermission>
        {
            new()
            {
                Id = 1,
                UserId = 42,
                PermissionId = 7,
                ProjectId = 3,
                GrantedAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
                Permission = new Permission { Id = 7, Code = "TICKET_CREATE", Name = "Talep Oluştur" }
            }
        };
        _userPermissionRepository.Setup(r => r.GetByUserIdAsync(42)).ReturnsAsync(permissions);

        var result = await _service.GetUserPermissionsAsync(42);

        Assert.Single(result);
        Assert.Equal("TICKET_CREATE", result[0].PermissionCode);
        Assert.Equal("Talep Oluştur", result[0].PermissionName);
        Assert.Equal(3, result[0].ProjectId);
    }

    [Fact]
    public async Task GetUserPermissionsAsync_WhenUserHasNoPermissions_ReturnsEmptyList()
    {
        _userPermissionRepository.Setup(r => r.GetByUserIdAsync(42)).ReturnsAsync(new List<UserPermission>());

        var result = await _service.GetUserPermissionsAsync(42);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllPermissionsAsync_MapsCatalogEntitiesToResponseDtos()
    {
        _permissionRepository.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Permission>
        {
            new() { Id = 1, Code = "TICKET_CREATE", Name = "Talep Oluştur", Description = "Yeni talep açabilir" }
        });

        var result = await _service.GetAllPermissionsAsync();

        Assert.Single(result);
        Assert.Equal("TICKET_CREATE", result[0].Code);
        Assert.Equal("Talep Oluştur", result[0].Name);
        Assert.Equal("Yeni talep açabilir", result[0].Description);
    }

    [Fact]
    public async Task RevokeAsync_WhenUserPermissionBelongsToUser_RemovesItAndReturnsTrue()
    {
        var userPermission = new UserPermission { Id = 5, UserId = 42, PermissionId = 7 };
        _userPermissionRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(userPermission);

        var result = await _service.RevokeAsync(userId: 42, id: 5);

        Assert.True(result);
        _userPermissionRepository.Verify(r => r.RevokeAsync(userPermission), Times.Once);
    }

    [Fact]
    public async Task RevokeAsync_WhenUserPermissionNotFound_ReturnsFalse()
    {
        _userPermissionRepository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((UserPermission?)null);

        var result = await _service.RevokeAsync(userId: 42, id: 99);

        Assert.False(result);
        _userPermissionRepository.Verify(r => r.RevokeAsync(It.IsAny<UserPermission>()), Times.Never);
    }

    [Fact]
    public async Task RevokeAsync_WhenUserPermissionBelongsToDifferentUser_ReturnsFalse()
    {
        var userPermission = new UserPermission { Id = 5, UserId = 999, PermissionId = 7 };
        _userPermissionRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(userPermission);

        var result = await _service.RevokeAsync(userId: 42, id: 5);

        Assert.False(result);
        _userPermissionRepository.Verify(r => r.RevokeAsync(It.IsAny<UserPermission>()), Times.Never);
    }
}

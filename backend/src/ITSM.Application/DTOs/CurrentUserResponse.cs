namespace ITSM.Application.DTOs;

public class CurrentUserResponse
{
    public long Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public long GroupId { get; set; }
    public bool IsAdmin { get; set; }
    public List<UserPermissionResponse> Permissions { get; set; } = new();
}

namespace ITSM.Application.DTOs;

public class UserResponse
{
    public long Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public long GroupId { get; set; }
    public required string GroupName { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

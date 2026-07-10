namespace ITSM.Domain.Entities;

public class UserPermission
{
    public long Id { get; set; }
    public required long UserId { get; set; }
    public required long PermissionId { get; set; }
    public long? ProjectId { get; set; }
    public DateTimeOffset GrantedAt { get; set; } = DateTimeOffset.UtcNow;

    public User User { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
    public Project? Project { get; set; }
}

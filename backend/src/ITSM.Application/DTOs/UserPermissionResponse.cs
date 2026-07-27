namespace ITSM.Application.DTOs;

public class UserPermissionResponse
{
    public required long Id { get; set; }
    public required string PermissionCode { get; set; }
    public required string PermissionName { get; set; }
    public long? ProjectId { get; set; }
    public required DateTimeOffset GrantedAt { get; set; }
}
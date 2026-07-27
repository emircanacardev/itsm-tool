namespace ITSM.Application.DTOs;

public class GrantPermissionRequest
{
    public required long PermissionId { get; set; }
    public long? ProjectId { get; set; }
}
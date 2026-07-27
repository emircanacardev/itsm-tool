namespace ITSM.Application.DTOs;

public class ProjectMemberResponse
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long UserId { get; set; }
    public required string UserFullName { get; set; }
    public required string UserEmail { get; set; }
}
namespace ITSM.Domain.Entities;

public class ProjectMember
{
    public long Id { get; set; }
    public required long ProjectId { get; set; }
    public required long UserId { get; set; }

    public Project Project { get; set; } = null!;
    public User User { get; set; } = null!;
}
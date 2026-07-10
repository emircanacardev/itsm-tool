namespace ITSM.Domain.Entities;

public class AutoAssignmentRule
{
    public long Id { get; set; }
    public required long ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public long? AssignToUserId { get; set; }
    public long? AssignToGroupId { get; set; }
    public int PriorityOrder { get; set; } = 0;

    public Project Project { get; set; } = null!;
    public Category? Category { get; set; }
    public User? AssignToUser { get; set; }
    public Group? AssignToGroup { get; set; }
}

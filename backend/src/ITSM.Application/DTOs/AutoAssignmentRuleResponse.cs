namespace ITSM.Application.DTOs;

public class AutoAssignmentRuleResponse
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? CategoryId { get; set; }
    public long? AssignToUserId { get; set; }
    public long? AssignToGroupId { get; set; }
    public int PriorityOrder { get; set; }
}

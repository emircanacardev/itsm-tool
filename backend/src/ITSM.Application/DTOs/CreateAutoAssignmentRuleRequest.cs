namespace ITSM.Application.DTOs;

public class CreateAutoAssignmentRuleRequest
{
    public long? CategoryId { get; set; }
    public long? AssignToUserId { get; set; }
    public long? AssignToGroupId { get; set; }
    public int PriorityOrder { get; set; } = 0;
}

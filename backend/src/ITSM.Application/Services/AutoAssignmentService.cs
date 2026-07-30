using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Domain.Entities;

namespace ITSM.Application.Services;

public class AutoAssignmentService
{
    private readonly IAutoAssignmentRuleRepository _ruleRepository;
    private readonly ITicketRepository _ticketRepository;

    public AutoAssignmentService(
        IAutoAssignmentRuleRepository ruleRepository,
        ITicketRepository ticketRepository)
    {
        _ruleRepository = ruleRepository;
        _ticketRepository = ticketRepository;
    }

    public async Task<AutoAssignmentRuleResponse?> CreateRuleAsync(long projectId, CreateAutoAssignmentRuleRequest request)
    {
        var hasUser = request.AssignToUserId is not null;
        var hasGroup = request.AssignToGroupId is not null;

        if (hasUser == hasGroup)
        {
            return null;
        }

        var rule = new AutoAssignmentRule
        {
            ProjectId = projectId,
            CategoryId = request.CategoryId,
            AssignToUserId = request.AssignToUserId,
            AssignToGroupId = request.AssignToGroupId,
            PriorityOrder = request.PriorityOrder
        };

        await _ruleRepository.AddAsync(rule);
        return MapToResponse(rule);
    }

    public async Task<List<AutoAssignmentRuleResponse>> GetRulesForProjectAsync(long projectId)
    {
        var rules = await _ruleRepository.GetByProjectAsync(projectId);
        return rules.Select(MapToResponse).ToList();
    }

    public async Task<bool> DeleteRuleAsync(long id, long projectId)
    {
        var rule = await _ruleRepository.GetByIdAsync(id);
        if (rule is null || rule.ProjectId != projectId)
        {
            return false;
        }

        await _ruleRepository.DeleteAsync(rule);
        return true;
    }

    public async Task<long?> GetAssigneeForTicketAsync(long projectId, long? categoryId)
    {
        var candidateRules = await _ruleRepository.GetByProjectAsync(projectId);

        var matchingRule = candidateRules
            .Where(r => r.CategoryId == null || r.CategoryId == categoryId)
            .OrderByDescending(r => r.CategoryId != null)
            .ThenBy(r => r.PriorityOrder)
            .FirstOrDefault();

        if (matchingRule is null)
        {
            return null;
        }

        if (matchingRule.AssignToUserId is not null)
        {
            return matchingRule.AssignToUserId;
        }

        if (matchingRule.AssignToGroupId is not null)
        {
            return await _ticketRepository.GetLeastLoadedUserInGroupAsync(matchingRule.AssignToGroupId.Value);
        }

        return null;
    }

    private static AutoAssignmentRuleResponse MapToResponse(AutoAssignmentRule rule)
    {
        return new AutoAssignmentRuleResponse
        {
            Id = rule.Id,
            ProjectId = rule.ProjectId,
            CategoryId = rule.CategoryId,
            AssignToUserId = rule.AssignToUserId,
            AssignToGroupId = rule.AssignToGroupId,
            PriorityOrder = rule.PriorityOrder
        };
    }
}

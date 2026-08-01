using ITSM.Application.Interfaces;
using ITSM.Application.Services;
using ITSM.Domain.Entities;
using Moq;

namespace ITSM.UnitTests;

public class AutoAssignmentServiceTests
{
    private readonly Mock<IAutoAssignmentRuleRepository> _ruleRepository = new();
    private readonly Mock<ITicketRepository> _ticketRepository = new();
    private readonly AutoAssignmentService _service;

    public AutoAssignmentServiceTests()
    {
        _service = new AutoAssignmentService(_ruleRepository.Object, _ticketRepository.Object);
    }

    [Fact]
    public async Task GetAssigneeForTicketAsync_NoRulesExist_ReturnsNull()
    {
        _ruleRepository.Setup(r => r.GetByProjectAsync(1)).ReturnsAsync(new List<AutoAssignmentRule>());

        var result = await _service.GetAssigneeForTicketAsync(projectId: 1, categoryId: 5);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetAssigneeForTicketAsync_CategorySpecificRuleExists_TakesPriorityOverGeneralRule()
    {
        var generalRule = new AutoAssignmentRule { Id = 1, ProjectId = 1, CategoryId = null, AssignToUserId = 100, PriorityOrder = 0 };
        var specificRule = new AutoAssignmentRule { Id = 2, ProjectId = 1, CategoryId = 5, AssignToUserId = 200, PriorityOrder = 0 };
        _ruleRepository.Setup(r => r.GetByProjectAsync(1)).ReturnsAsync(new List<AutoAssignmentRule> { generalRule, specificRule });

        var result = await _service.GetAssigneeForTicketAsync(projectId: 1, categoryId: 5);

        Assert.Equal(200, result);
    }

    [Fact]
    public async Task GetAssigneeForTicketAsync_MultipleMatchingRules_LowestPriorityOrderWins()
    {
        var ruleA = new AutoAssignmentRule { Id = 1, ProjectId = 1, CategoryId = 5, AssignToUserId = 100, PriorityOrder = 2 };
        var ruleB = new AutoAssignmentRule { Id = 2, ProjectId = 1, CategoryId = 5, AssignToUserId = 200, PriorityOrder = 1 };
        _ruleRepository.Setup(r => r.GetByProjectAsync(1)).ReturnsAsync(new List<AutoAssignmentRule> { ruleA, ruleB });

        var result = await _service.GetAssigneeForTicketAsync(projectId: 1, categoryId: 5);

        Assert.Equal(200, result);
    }

    [Fact]
    public async Task GetAssigneeForTicketAsync_RuleAssignsToGroup_DelegatesToLeastLoadedUserLookup()
    {
        var rule = new AutoAssignmentRule { Id = 1, ProjectId = 1, CategoryId = null, AssignToGroupId = 10, PriorityOrder = 0 };
        _ruleRepository.Setup(r => r.GetByProjectAsync(1)).ReturnsAsync(new List<AutoAssignmentRule> { rule });
        _ticketRepository.Setup(r => r.GetLeastLoadedUserInGroupAsync(10)).ReturnsAsync(42);

        var result = await _service.GetAssigneeForTicketAsync(projectId: 1, categoryId: null);

        Assert.Equal(42, result);
        _ticketRepository.Verify(r => r.GetLeastLoadedUserInGroupAsync(10), Times.Once);
    }

    [Fact]
    public async Task GetAssigneeForTicketAsync_RuleAssignsToUser_DoesNotQueryTicketRepository()
    {
        var rule = new AutoAssignmentRule { Id = 1, ProjectId = 1, CategoryId = null, AssignToUserId = 7, PriorityOrder = 0 };
        _ruleRepository.Setup(r => r.GetByProjectAsync(1)).ReturnsAsync(new List<AutoAssignmentRule> { rule });

        var result = await _service.GetAssigneeForTicketAsync(projectId: 1, categoryId: null);

        Assert.Equal(7, result);
        _ticketRepository.Verify(r => r.GetLeastLoadedUserInGroupAsync(It.IsAny<long>()), Times.Never);
    }
}
using FluentAssertions;
using Moq;
using SlobSteak.Application.Stakeholders;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Stakeholders;

namespace SlobSteak.Application.Tests.Stakeholders;

/// <summary>Tests für <see cref="ListStakeholdersService"/> (US-023) gegen ein gemocktes
/// <see cref="IStakeholderRepository"/> — ohne echte Datenbank.</summary>
public class ListStakeholdersServiceTests
{
    [Fact]
    public async Task ListActiveStakeholdersAsync_DelegatesToRepository_FindActiveByProjectAsync()
    {
        var projectId = Guid.NewGuid();
        var stakeholders = new List<Stakeholder>
        {
            Stakeholder.Create(projectId, StakeholderType.Person, "Max Mustermann", null, null, null, null, null, null, Guid.NewGuid()),
        };
        var repository = new Mock<IStakeholderRepository>();
        repository.Setup(r => r.FindActiveByProjectAsync(projectId, It.IsAny<CancellationToken>())).ReturnsAsync(stakeholders);
        var service = new ListStakeholdersService(repository.Object);

        var result = await service.ListActiveStakeholdersAsync(projectId);

        result.Should().BeEquivalentTo(stakeholders);
    }
}

using FluentAssertions;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Domain.Tests.Shared;

/// <summary>
/// Unit-Tests für die zentralen Enums des Shared Kernel (US-002). Prüfen, dass jedes Enum
/// exakt die im PRD/Story-Dokument geforderten Werte definiert — nicht mehr, nicht weniger.
/// </summary>
public class EnumsTests
{
    [Fact]
    public void ProjectRole_DefinesExactlyPlCoreteamArchitectAndUser()
    {
        Enum.GetNames<ProjectRole>().Should().BeEquivalentTo("PL", "Coreteam", "Architect", "User");
    }

    [Fact]
    public void ProjectRole_DoesNotContainAdmin()
    {
        Enum.GetNames<ProjectRole>().Should().NotContain("Admin");
    }

    [Fact]
    public void StakeholderType_DefinesExactlyPersonAndOrganization()
    {
        Enum.GetNames<StakeholderType>().Should().BeEquivalentTo("Person", "Organization");
    }

    [Fact]
    public void CommunicationFrequency_DefinesExactlyWeeklyMonthlyQuarterlyAndAdHoc()
    {
        Enum.GetNames<CommunicationFrequency>().Should().BeEquivalentTo("Weekly", "Monthly", "Quarterly", "AdHoc");
    }

    [Fact]
    public void CommunicationChannel_DefinesExactlyEmailMeetingAndReport()
    {
        Enum.GetNames<CommunicationChannel>().Should().BeEquivalentTo("Email", "Meeting", "Report");
    }
}

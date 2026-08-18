using FluentAssertions;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Domain.Tests.UserStories;

/// <summary>
/// Dedizierter Story-Test für US-002 (Zentrale Value Objects: Email, Rolle, Score, Enums).
/// Prüft ausschließlich die in <c>docs/usecases/US-002-value-objects.md</c> gelisteten
/// Akzeptanzkriterien, ein <see cref="FactAttribute"/>/<see cref="TheoryAttribute"/> je Kriterium,
/// in derselben Reihenfolge wie im Story-Dokument.
///
/// <para>
/// Abweichend von der in CLAUDE.md Kernregel 3 beschriebenen Konvention
/// (<c>tests/SlobSteak.Api.Tests/UserStories/US0NN_*Tests.cs</c> via
/// <c>WebApplicationFactory&lt;Program&gt;</c>) liegt dieser Story-Test in
/// <c>SlobSteak.Domain.Tests</c>: US-002 liefert ausschließlich Shared-Kernel-Value-Objects/Enums
/// ohne API- oder Frontend-Anteil, ein Integrationstest gegen die Web-API wäre daher nicht
/// aussagekräftig. Dies ist die PRD-/CLAUDE.md-konformste verfügbare Interpretation (Abschnitt 4,
/// „Anmerkungen des Dev-Agenten“), keine stille Abweichung von Kernregel 3.
/// </para>
/// </summary>
public class US002_ValueObjectsTests
{
    // AC 1: Email lehnt ungültige Formate mit InvalidEmailFormatError ab;
    // mindestens 3 gültige und 3 ungültige Beispiele.
    [Theory]
    [InlineData("a@b.de")]
    [InlineData("test.user@example.com")]
    [InlineData("info+tag@sub.domain.io")]
    public void AC1_Email_AcceptsValidFormats(string validValue)
    {
        var act = () => new Email(validValue);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("no-at-sign.de")]
    [InlineData("missing-domain@")]
    [InlineData("@missing-local.de")]
    public void AC1_Email_RejectsInvalidFormatsWithInvalidEmailFormatError(string invalidValue)
    {
        var act = () => new Email(invalidValue);

        act.Should().Throw<InvalidEmailFormatError>();
    }

    // AC 2: Score akzeptiert ausschließlich Ganzzahlen 0–100 (inklusive); Werte außerhalb werfen
    // InvalidScoreRangeError; Grenzwerte 0, 100, -1, 101.
    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    public void AC2_Score_AcceptsBoundaryValuesWithinRange(int boundaryValue)
    {
        var act = () => new Score(boundaryValue);

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void AC2_Score_RejectsBoundaryValuesOutsideRangeWithInvalidScoreRangeError(int boundaryValue)
    {
        var act = () => new Score(boundaryValue);

        act.Should().Throw<InvalidScoreRangeError>();
    }

    // AC 3: ProjectRole definiert exakt PL, Coreteam, Architect, User (Admin ist kein Wert).
    [Fact]
    public void AC3_ProjectRole_DefinesExactlyPlCoreteamArchitectUser_AndNotAdmin()
    {
        var names = Enum.GetNames<ProjectRole>();

        names.Should().BeEquivalentTo("PL", "Coreteam", "Architect", "User");
        names.Should().NotContain("Admin");
    }

    // AC 4: StakeholderType definiert Person, Organization.
    [Fact]
    public void AC4_StakeholderType_DefinesPersonAndOrganization()
    {
        Enum.GetNames<StakeholderType>().Should().BeEquivalentTo("Person", "Organization");
    }

    // AC 5: CommunicationFrequency definiert Weekly, Monthly, Quarterly, AdHoc.
    [Fact]
    public void AC5_CommunicationFrequency_DefinesWeeklyMonthlyQuarterlyAdHoc()
    {
        Enum.GetNames<CommunicationFrequency>().Should().BeEquivalentTo("Weekly", "Monthly", "Quarterly", "AdHoc");
    }

    // AC 6: CommunicationChannel definiert Email, Meeting, Report.
    [Fact]
    public void AC6_CommunicationChannel_DefinesEmailMeetingReport()
    {
        Enum.GetNames<CommunicationChannel>().Should().BeEquivalentTo("Email", "Meeting", "Report");
    }

    // AC 7: Value Objects sind als record/readonly struct implementiert (unveränderlich,
    // strukturelle Gleichheit kommt automatisch von der Sprache).
    [Fact]
    public void AC7_ValueObjects_HaveStructuralEquality()
    {
        (new Email("a@b.de") == new Email("a@b.de")).Should().BeTrue();
        (new Score(50) == new Score(50)).Should().BeTrue();
    }
}

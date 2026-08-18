using System.Net;
using FluentAssertions;

namespace SlobSteak.Api.Tests;

/// <summary>
/// Integrationstest für US-001 (Projekt-Grundgerüst). Prüft den Health-Check-Endpoint
/// <c>GET /api/v1/health</c> über eine echte In-Memory-<see cref="SlobSteakApiFactory"/>-Instanz
/// und dient zugleich als Beispieltest für das xUnit-Setup in <c>SlobSteak.Api.Tests</c>.
/// </summary>
public class HealthCheckTests : IClassFixture<SlobSteakApiFactory>
{
    private readonly SlobSteakApiFactory _factory;

    public HealthCheckTests(SlobSteakApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetHealth_ReturnsOkWithStatusOk()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Be("{\"status\":\"ok\"}");
    }
}

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SlobSteak.Api.Authorization;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Exceptions;

namespace SlobSteak.Api.Controllers.Admin;

/// <summary>Request-DTO für <see cref="AdminProjectController.CreateProject"/>. Validierung
/// erfolgt an der API-Grenze über Data Annotations (CLAUDE.md Abschnitt 3.7); ein rein
/// whitespace-bestehender Name wird davon nicht erfasst und fällt auf die zweite
/// Verteidigungslinie in <see cref="Project.Create"/> zurück.</summary>
public sealed class CreateProjectRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;

    public string? Description { get; init; }
}

/// <summary>Response-DTO für ein angelegtes Projekt. Wire-Contract camelCase gemäß CLAUDE.md
/// Abschnitt 3.1.</summary>
public sealed record ProjectResponse(Guid Id, string Name, string? Description, string Status, DateTimeOffset CreatedAt)
{
    public static ProjectResponse FromDomain(Project project) =>
        new(project.Id, project.Name, project.Description, project.Status.ToString(), project.CreatedAt);
}

/// <summary>Response-DTO für einen Eintrag der Admin-Projektliste (US-017 Akzeptanzkriterium 1).
/// Enthält zusätzlich <c>memberCount</c>, das <see cref="ProjectResponse"/> bewusst nicht führt.</summary>
public sealed record ProjectListItemResponse(Guid Id, string Name, string? Description, string Status, int MemberCount, DateTimeOffset CreatedAt)
{
    public static ProjectListItemResponse FromDomain(Project project) =>
        new(project.Id, project.Name, project.Description, project.Status.ToString(), project.Memberships.Count, project.CreatedAt);
}

/// <summary>Admin-API für Projektverwaltung (US-014, erweitert um die Liste in US-017).
/// Ausschließlich für Systemadmins erreichbar (PRD Berechtigungsmatrix, Abschnitt 2.3).</summary>
[ApiController]
[Route("api/v1/admin/projects")]
[Authorize(Policy = AuthorizationPolicies.SystemAdmin)]
public sealed class AdminProjectController : ControllerBase
{
    private readonly CreateProjectService _createProjectService;
    private readonly ListProjectsService _listProjectsService;

    public AdminProjectController(CreateProjectService createProjectService, ListProjectsService listProjectsService)
    {
        _createProjectService = createProjectService;
        _listProjectsService = listProjectsService;
    }

    /// <summary>Listet alle Projekte mit Name, Status und Mitgliederzahl (US-017: Sub-Bereich
    /// „Projekte“ im Admin-Bereich, Akzeptanzkriterium 1).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectListItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListProjects(CancellationToken cancellationToken)
    {
        var projects = await _listProjectsService.ListProjectsAsync(cancellationToken);
        return Ok(projects.Select(ProjectListItemResponse.FromDomain));
    }

    /// <summary>Legt ein neues Projekt an (Status <c>active</c>).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var project = await _createProjectService.CreateProjectAsync(request.Name, request.Description, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, ProjectResponse.FromDomain(project));
        }
        catch (ProjectNameRequiredError)
        {
            return BadRequest(new { error = "PROJECT_NAME_REQUIRED" });
        }
    }
}

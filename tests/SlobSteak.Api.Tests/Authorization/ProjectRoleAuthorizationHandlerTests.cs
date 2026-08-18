using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Moq;
using SlobSteak.Api.Authorization;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Api.Tests.Authorization;

/// <summary>
/// Unit-Tests für <see cref="ProjectRoleAuthorizationHandler"/> (US-007) gegen einen echten
/// <see cref="AuthorizationHandlerContext"/> (kein volles HTTP-Pipeline-Setup nötig) mit
/// gemocktem <see cref="IProjectRepository"/> — deckt exemplarisch die Kombinationen aus der
/// PRD-Berechtigungsmatrix (Abschnitt 2.3) ab: PL darf Stakeholder löschen, Coreteam darf nicht,
/// User darf keine Assessments lesen.
/// </summary>
public class ProjectRoleAuthorizationHandlerTests
{
    private static readonly Guid ProjectId = Guid.NewGuid();

    [Fact]
    public async Task HandleRequirementAsync_UserWithAllowedRole_Succeeds()
    {
        var userId = Guid.NewGuid();
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(userId, ProjectRole.PL);

        var context = await RunHandlerAsync(userId, project, allowedRoles: new[] { ProjectRole.PL });

        context.HasSucceeded.Should().BeTrue();
    }

    [Fact]
    public async Task HandleRequirementAsync_UserWithDisallowedRole_DoesNotSucceed()
    {
        var userId = Guid.NewGuid();
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(userId, ProjectRole.Coreteam);

        var context = await RunHandlerAsync(userId, project, allowedRoles: new[] { ProjectRole.PL });

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task HandleRequirementAsync_UserRoleIsUser_CannotReadAssessments()
    {
        var userId = Guid.NewGuid();
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(userId, ProjectRole.User);

        var context = await RunHandlerAsync(
            userId, project, allowedRoles: new[] { ProjectRole.PL, ProjectRole.Coreteam, ProjectRole.Architect });

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task HandleRequirementAsync_SystemAdminWithoutProjectMembership_DoesNotSucceed()
    {
        // PRD Abschnitt 2.3 Fußnote *: Admin hat fachliche Rechte nur mit zusätzlicher
        // Projektzuweisung — IsSystemAdmin allein reicht für die ProjectRole-Policy nicht.
        var userId = Guid.NewGuid();
        var project = Project.Create("Projekt Phoenix", null);

        var context = await RunHandlerAsync(userId, project, allowedRoles: new[] { ProjectRole.PL });

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task HandleRequirementAsync_UserWithoutSubClaim_DoesNotSucceed()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var user = new ClaimsPrincipal(new ClaimsIdentity());

        var context = await RunHandlerAsync(user, project, allowedRoles: new[] { ProjectRole.PL });

        context.HasSucceeded.Should().BeFalse();
    }

    [Fact]
    public async Task HandleRequirementAsync_MissingProjectIdRouteValue_DoesNotSucceed()
    {
        var userId = Guid.NewGuid();
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(userId, ProjectRole.PL);

        var httpContext = new DefaultHttpContext();
        var context = await RunHandlerAsync(BuildUser(userId), project, new[] { ProjectRole.PL }, httpContext);

        context.HasSucceeded.Should().BeFalse();
    }

    private static Task<AuthorizationHandlerContext> RunHandlerAsync(
        Guid userId, Project project, IEnumerable<ProjectRole> allowedRoles) =>
        RunHandlerAsync(BuildUser(userId), project, allowedRoles, BuildHttpContext(project.Id));

    private static async Task<AuthorizationHandlerContext> RunHandlerAsync(
        ClaimsPrincipal user, Project project, IEnumerable<ProjectRole> allowedRoles, HttpContext? httpContext = null)
    {
        httpContext ??= BuildHttpContext(project.Id);

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(httpContext);

        var projectRepository = new Mock<IProjectRepository>();
        projectRepository.Setup(r => r.FindByIdAsync(project.Id, It.IsAny<CancellationToken>())).ReturnsAsync(project);

        var handler = new ProjectRoleAuthorizationHandler(httpContextAccessor.Object, projectRepository.Object);
        var requirement = new ProjectRoleRequirement(allowedRoles.ToArray());
        var context = new AuthorizationHandlerContext(new[] { requirement }, user, resource: null);

        await handler.HandleAsync(context);

        return context;
    }

    private static ClaimsPrincipal BuildUser(Guid userId) =>
        new(new ClaimsIdentity(new[] { new Claim("sub", userId.ToString()) }, authenticationType: "Test"));

    private static HttpContext BuildHttpContext(Guid projectId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.RouteValues["projectId"] = projectId.ToString();
        return httpContext;
    }
}

using FluentAssertions;
using Moq;
using SlobSteak.Application.Projects;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;
using SlobSteak.Domain.Shared.Exceptions;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Tests.Projects;

/// <summary>Tests für <see cref="AssignProjectMembershipService"/> (US-015) gegen gemockte
/// Repositories — ohne echte Datenbank.</summary>
public class AssignProjectMembershipServiceTests
{
    private static readonly User ExistingUser = User.Create("Nutzer", "user@example.com", "correct-horse");

    [Fact]
    public async Task AssignMemberAsync_ExistingProjectAndUser_AssignsMembership()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var (projectRepository, userRepository) = MockRepositories(project, ExistingUser);

        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.AssignMemberAsync(project.Id, ExistingUser.Id, ProjectRole.PL);

        result.Should().NotBeNull();
        result!.Memberships.Should().ContainSingle(m => m.UserId == ExistingUser.Id && m.Role == ProjectRole.PL);
        projectRepository.Verify(r => r.SaveAsync(project, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AssignMemberAsync_UnknownProject_ReturnsNull()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var (projectRepository, userRepository) = MockRepositories(project: null, ExistingUser);

        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.AssignMemberAsync(Guid.NewGuid(), ExistingUser.Id, ProjectRole.PL);

        result.Should().BeNull();
    }

    [Fact]
    public async Task AssignMemberAsync_UnknownUser_ReturnsNull()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var (projectRepository, userRepository) = MockRepositories(project, user: null);

        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.AssignMemberAsync(project.Id, Guid.NewGuid(), ProjectRole.PL);

        result.Should().BeNull();
    }

    [Fact]
    public async Task AssignMemberAsync_AlreadyAMember_ThrowsMembershipAlreadyExistsError()
    {
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(ExistingUser.Id, ProjectRole.Coreteam);
        var (projectRepository, userRepository) = MockRepositories(project, ExistingUser);

        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var act = async () => await service.AssignMemberAsync(project.Id, ExistingUser.Id, ProjectRole.PL);

        await act.Should().ThrowAsync<MembershipAlreadyExistsError>();
    }

    [Fact]
    public async Task ChangeMemberRoleAsync_ExistingMembership_UpdatesRole()
    {
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(ExistingUser.Id, ProjectRole.Coreteam);
        var (projectRepository, userRepository) = MockRepositories(project, ExistingUser);

        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.ChangeMemberRoleAsync(project.Id, ExistingUser.Id, ProjectRole.Architect);

        result.Should().NotBeNull();
        result!.Memberships.Should().ContainSingle(m => m.UserId == ExistingUser.Id && m.Role == ProjectRole.Architect);
    }

    [Fact]
    public async Task ChangeMemberRoleAsync_UnknownProject_ReturnsNull()
    {
        var (projectRepository, userRepository) = MockRepositories(project: null, ExistingUser);
        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.ChangeMemberRoleAsync(Guid.NewGuid(), ExistingUser.Id, ProjectRole.PL);

        result.Should().BeNull();
    }

    [Fact]
    public async Task ChangeMemberRoleAsync_NoExistingMembership_ThrowsMembershipNotFoundError()
    {
        var project = Project.Create("Projekt Phoenix", null);
        var (projectRepository, userRepository) = MockRepositories(project, ExistingUser);
        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var act = async () => await service.ChangeMemberRoleAsync(project.Id, ExistingUser.Id, ProjectRole.PL);

        await act.Should().ThrowAsync<MembershipNotFoundError>();
    }

    [Fact]
    public async Task RemoveMemberAsync_ExistingProject_RemovesMembership_ReturnsTrue()
    {
        var project = Project.Create("Projekt Phoenix", null);
        project.AssignMember(ExistingUser.Id, ProjectRole.PL);
        var (projectRepository, userRepository) = MockRepositories(project, ExistingUser);
        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.RemoveMemberAsync(project.Id, ExistingUser.Id);

        result.Should().BeTrue();
        project.Memberships.Should().BeEmpty();
    }

    [Fact]
    public async Task RemoveMemberAsync_UnknownProject_ReturnsFalse()
    {
        var (projectRepository, userRepository) = MockRepositories(project: null, ExistingUser);
        var service = new AssignProjectMembershipService(projectRepository.Object, userRepository.Object);

        var result = await service.RemoveMemberAsync(Guid.NewGuid(), ExistingUser.Id);

        result.Should().BeFalse();
    }

    private static (Mock<IProjectRepository> ProjectRepository, Mock<IUserRepository> UserRepository) MockRepositories(Project? project, User? user)
    {
        var projectRepository = new Mock<IProjectRepository>();
        projectRepository
            .Setup(r => r.FindByIdAsync(project != null ? project.Id : It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(project);

        var userRepository = new Mock<IUserRepository>();
        userRepository
            .Setup(r => r.FindByIdAsync(user != null ? user.Id : It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        return (projectRepository, userRepository);
    }
}

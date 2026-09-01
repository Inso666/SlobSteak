using FluentAssertions;
using Moq;
using SlobSteak.Application.Identity;
using SlobSteak.Domain.Identity;
using SlobSteak.Domain.Shared.ValueObjects;

namespace SlobSteak.Application.Tests.Identity;

/// <summary>
/// Tests für <see cref="LoginService"/> (US-006) gegen gemockte Abhängigkeiten (<see
/// cref="IUserRepository"/>, <see cref="IJwtTokenGenerator"/>) — ohne echte Datenbank.
/// </summary>
public class LoginServiceTests
{
    private const string Password = "correct-horse";
    private const string IssuedToken = "issued-jwt-token";

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsTokenAndMustChangePasswordFlag()
    {
        var user = User.Create("Max Mustermann", "max@example.com", Password);
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByEmailAsync(It.Is<Email>(e => e.Value == "max@example.com"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var tokenGenerator = new Mock<IJwtTokenGenerator>();
        // US-074: LoginService reicht zusätzlich den Anzeigenamen durch (Sidebar-Nutzerkarte).
        tokenGenerator.Setup(g => g.GenerateToken(user.Id, user.IsSystemAdmin, user.Name)).Returns(IssuedToken);

        var service = new LoginService(repository.Object, tokenGenerator.Object);

        var result = await service.LoginAsync("max@example.com", Password);

        result.Should().NotBeNull();
        result!.Token.Should().Be(IssuedToken);
        result.MustChangePassword.Should().Be(user.MustChangePassword);
    }

    [Fact]
    public async Task LoginAsync_WithUnknownEmail_ReturnsNull()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByEmailAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var service = new LoginService(repository.Object, Mock.Of<IJwtTokenGenerator>());

        var result = await service.LoginAsync("unbekannt@example.com", Password);

        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ReturnsNull()
    {
        var user = User.Create("Max Mustermann", "max@example.com", Password);
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByEmailAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var service = new LoginService(repository.Object, Mock.Of<IJwtTokenGenerator>());

        var result = await service.LoginAsync("max@example.com", "falsches-passwort");

        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_UnknownEmailAndWrongPassword_ReturnIdenticalNullResult_NoUserEnumeration()
    {
        var user = User.Create("Max Mustermann", "max@example.com", Password);
        var repository = new Mock<IUserRepository>();
        repository.Setup(r => r.FindByEmailAsync(It.Is<Email>(e => e.Value == "max@example.com"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        repository.Setup(r => r.FindByEmailAsync(It.Is<Email>(e => e.Value != "max@example.com"), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var service = new LoginService(repository.Object, Mock.Of<IJwtTokenGenerator>());

        var unknownEmailResult = await service.LoginAsync("unbekannt@example.com", Password);
        var wrongPasswordResult = await service.LoginAsync("max@example.com", "falsch");

        unknownEmailResult.Should().Be(wrongPasswordResult);
    }
}

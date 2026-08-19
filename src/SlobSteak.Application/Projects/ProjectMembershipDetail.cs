using SlobSteak.Domain.Projects;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Projects;

/// <summary>
/// Application-seitiges Lesemodell (US-017): eine Mitgliedschaft mit dem aufgelösten Namen/
/// E-Mail des zugehörigen Nutzers. Kein Domain-Konzept — <see cref="Project"/> kennt nur die rohe
/// <c>UserId</c> (Bounded-Context-Grenze zu IdentityAccess, CLAUDE.md Abschnitt 3.1); die
/// Zusammenführung mit <see cref="SlobSteak.Domain.Identity.User"/> passiert bewusst erst hier in
/// der Application-Schicht, nicht per EF-Core-Navigation über die Aggregate-Grenze hinweg.
/// </summary>
public sealed record ProjectMembershipDetail(Guid UserId, string UserName, string UserEmail, ProjectRole Role);

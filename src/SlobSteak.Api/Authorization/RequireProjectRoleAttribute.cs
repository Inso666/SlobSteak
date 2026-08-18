using Microsoft.AspNetCore.Authorization;
using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Api.Authorization;

/// <summary>
/// Deklaratives Binden der <see cref="AuthorizationPolicies.ProjectRole"/>-Policy an eine
/// Controller-Action mit den für diese Action konkret zugelassenen Rollen, z. B.
/// <c>[RequireProjectRole(ProjectRole.PL)]</c> für "Stakeholder löschen" (PRD Berechtigungsmatrix,
/// Abschnitt 2.3). Nutzt das seit .NET 8 verfügbare <see cref="IAuthorizationRequirementData"/>,
/// damit unterschiedliche Actions unterschiedliche <see cref="ProjectRoleRequirement"/>-Instanzen
/// (mit jeweils eigenen erlaubten Rollen) über eine einzige, wiederverwendbare Policy erhalten
/// können — ein einzelner statischer Policy-Name allein könnte keine pro Action variierende
/// Rollenliste transportieren.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class RequireProjectRoleAttribute : AuthorizeAttribute, IAuthorizationRequirementData
{
    private readonly ProjectRole[] _allowedRoles;

    public RequireProjectRoleAttribute(params ProjectRole[] allowedRoles)
    {
        _allowedRoles = allowedRoles;

        // Bewusst KEIN Policy-Name gesetzt: IAuthorizationRequirementData liefert die Requirements
        // direkt an die pro Endpoint dynamisch kombinierte Policy, ohne eine registrierte
        // Policy (AddPolicy) mit diesem Namen vorauszusetzen. AuthorizationPolicies.ProjectRole
        // bleibt als dokumentierte/konzeptionelle Konstante bestehen (siehe deren XML-Doc), wird
        // hier aber nicht als Lookup-Name verwendet, um einen doppelten (fehlschlagenden)
        // Named-Policy-Lookup zu vermeiden.
    }

    public IEnumerable<IAuthorizationRequirement> GetRequirements()
    {
        yield return new ProjectRoleRequirement(_allowedRoles);
    }
}

using SlobSteak.Domain.Shared.Enums;

namespace SlobSteak.Application.Projects;

/// <summary>Bewertungsfortschritt einer einzelnen perspektiv-tragenden Rolle (US-076): Anteil
/// aktiver Stakeholder eines Projekts, für die diese Rolle ein Assessment abgegeben hat.</summary>
/// <param name="Percent">Gerundeter Anteil bewerteter aktiver Stakeholder, 0–100. Hat das Projekt
/// keine aktiven Stakeholder, ist <see cref="Percent"/> <c>0</c> (kein Assessment möglich, sinnvoller
/// Default statt Division durch 0 — siehe „Anmerkungen des Agenten" in der Story-Datei).</param>
/// <param name="UnassessedCount">Absolute Anzahl aktiver Stakeholder ohne Assessment dieser Rolle —
/// Grundlage für den „X unbewertet · deine Sicht"-Hinweis (Akzeptanzkriterium 5), bewusst als
/// eigenes Feld statt aus dem gerundeten <see cref="Percent"/> zurückgerechnet.</param>
public sealed record RoleAssessmentProgress(int Percent, int UnassessedCount);

/// <summary>Bewertungsfortschritt eines Projekts, je perspektiv-tragender Rolle (US-076
/// Akzeptanzkriterium 2).</summary>
public sealed record ProjectAssessmentProgress(
    Guid ProjectId,
    RoleAssessmentProgress Pl,
    RoleAssessmentProgress Coreteam,
    RoleAssessmentProgress Architect)
{
    /// <summary>Liefert den Fortschritt für eine konkrete perspektiv-tragende Rolle — Grundlage für
    /// den „unbewertet · deine Sicht"-Hinweis der eigenen Rolle des angemeldeten Nutzers
    /// (Akzeptanzkriterium 5). Rolle <see cref="ProjectRole.User"/> trägt keine eigene Perspektive
    /// und liefert daher <c>null</c>.</summary>
    public RoleAssessmentProgress? ForRole(ProjectRole role) => role switch
    {
        ProjectRole.PL => Pl,
        ProjectRole.Coreteam => Coreteam,
        ProjectRole.Architect => Architect,
        _ => null,
    };
}

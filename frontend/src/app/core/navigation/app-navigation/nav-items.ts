/**
 * Konfiguration der globalen Navigationseinträge (US-045, PRD Abschnitt 6.3: „Sidebar (global):
 * Projektübersicht — … — Abmelden“). Als Liste statt hartkodiertem Markup modelliert, damit
 * Folge-Stories (insbesondere US-046: „Admin“-Eintrag, nur `is_system_admin`) einen weiteren
 * Eintrag ergänzen können, ohne das Template von {@link AppNavigationComponent} anzufassen —
 * z. B. durch eine zweite, bedingt gerenderte Liste oder ein `visible`-Prädikat je Eintrag.
 *
 * Zentrale Stelle für das Navigations-Wording (siehe .claude/agents/frontend.md Abschnitt 2:
 * UI-Texte nicht verteilt hartcodieren), damit Wording-Anpassungen künftig an einer Stelle
 * gepflegt werden.
 */
export interface AppNavLink {
  /** Sichtbarer Linktext. */
  readonly label: string;
  /** Ziel-Route für `routerLink`. */
  readonly route: string;
}

/**
 * Statische Navigationslinks, die für jeden angemeldeten Nutzer gleichermaßen sichtbar sind
 * (Akzeptanzkriterium 2). Der „Admin“-Eintrag ist bewusst nicht Teil dieser Liste — er folgt in
 * US-046 als rollenabhängig gerenderter Eintrag.
 */
export const APP_NAV_LINKS: readonly AppNavLink[] = [
  { label: 'Projektübersicht', route: '/projects' },
];

/** Text der „Abmelden“-Aktion — kein Navigationslink, sondern ein Button mit Seiteneffekt (Akzeptanzkriterium 4). */
export const APP_NAV_LOGOUT_LABEL = 'Abmelden';

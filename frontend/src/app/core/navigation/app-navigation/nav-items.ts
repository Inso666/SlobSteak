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
  /** US-074 Akzeptanzkriterium „Sidebar": PrimeIcons-Klasse (ohne führendes `pi`-Präfix, z. B.
   * `pi-th-large`) gemäß `docs/design/Main.dc.html`/`SPEC-02-Projektuebersicht.md` §1.2. */
  readonly icon: string;
}

/**
 * Statische Navigationslinks, die für jeden angemeldeten Nutzer gleichermaßen sichtbar sind
 * (Akzeptanzkriterium 2). Der „Admin“-Eintrag ist bewusst nicht Teil dieser Liste — seine
 * Sichtbarkeit hängt zusätzlich von `isSystemAdmin` ab, siehe {@link APP_NAV_ADMIN_LINK}.
 */
export const APP_NAV_LINKS: readonly AppNavLink[] = [
  { label: 'Projektübersicht', route: '/projects', icon: 'pi-th-large' },
];

/**
 * „Admin“-Eintrag der globalen Navigation (US-046, PRD Abschnitt 6.3: „Admin (nur
 * `is_system_admin`)“). Getrennt von {@link APP_NAV_LINKS} modelliert, weil `AppNavigationComponent`
 * ihn nur rendert, wenn zusätzlich zum Session-Token auch `TokenStorageService.getClaims()
 * ?.isSystemAdmin` zutrifft (Akzeptanzkriterium 1/2) — Angulars `@if` entfernt den Eintrag dabei
 * vollständig aus dem DOM statt ihn nur per CSS zu verstecken. `/admin/users` ist der in
 * Akzeptanzkriterium 3 geforderte Standard-Einstieg in den Admin-Bereich.
 */
export const APP_NAV_ADMIN_LINK: AppNavLink = { label: 'Admin', route: '/admin/users', icon: 'pi-shield' };

/** Text der „Abmelden“-Aktion — kein Navigationslink, sondern ein Button mit Seiteneffekt (Akzeptanzkriterium 4). */
export const APP_NAV_LOGOUT_LABEL = 'Abmelden';

/**
 * US-075: Wording der drei Projekt-Kontext-Unterpunkte (eingerückter Sidebar-Block innerhalb eines
 * geöffneten Projekts) — zentral hier gepflegt statt in `app-navigation.component.html`
 * hartkodiert (`.claude/agents/frontend.md` Abschnitt 3), identisch mit dem bisherigen Wortlaut der
 * entfallenen `project-workspace-layout.component.html`-Tab-Pills sowie den vier
 * `docs/design`-Artboards (`Detail.dc.html`, `Map.dc.html`, `StakeholderList.dc.html`,
 * `Verteiler.dc.html`).
 */
export const APP_NAV_PROJECT_SUB_ITEM_LABELS = {
  stakeholders: 'Stakeholder-Liste',
  map: 'Map',
  distribution: 'Verteiler',
} as const;

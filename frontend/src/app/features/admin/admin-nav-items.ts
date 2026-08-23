/**
 * Konfiguration der Sub-Navigation innerhalb des Admin-Bereichs (US-046, PRD Abschnitt 6.2
 * Screen S5: Sub-Bereiche „Nutzer“/„Projekte“/„Kommunikationsarten-Katalog“). Als Liste statt
 * hartkodiertem Zwei-Elemente-Markup modelliert (Story-Datei „Anmerkungen des Dev-Agenten“),
 * damit der PRD-seitig vorgesehene dritte Sub-Bereich „Kommunikationsarten-Katalog“ (folgt erst
 * mit US-038) später ergänzt werden kann, ohne {@link AdminSubNavComponent} strukturell
 * umzubauen.
 */
export interface AdminSubNavLink {
  /** Sichtbarer Linktext. */
  readonly label: string;
  /** Ziel-Route für `routerLink`. */
  readonly route: string;
}

/** Sub-Navigationslinks, eingebunden in `UsersAdminComponent` und `ProjectsAdminComponent` (Akzeptanzkriterium 4). */
export const ADMIN_SUB_NAV_LINKS: readonly AdminSubNavLink[] = [
  { label: 'Nutzer', route: '/admin/users' },
  { label: 'Projekte', route: '/admin/projects' },
];

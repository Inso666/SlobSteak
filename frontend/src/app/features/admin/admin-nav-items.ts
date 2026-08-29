/**
 * Konfiguration der Sub-Navigation innerhalb des Admin-Bereichs (US-046, PRD Abschnitt 6.2
 * Screen S5: Sub-Bereiche „Nutzer“/„Projekte“/„Kommunikationsarten-Katalog“). Als Liste statt
 * hartkodiertem Zwei-Elemente-Markup modelliert (Story-Datei „Anmerkungen des Dev-Agenten“),
 * damit der PRD-seitig vorgesehene dritte Sub-Bereich „Kommunikationsarten-Katalog“ später ohne
 * strukturellen Umbau des Tab-Host ergänzt werden kann — US-038 nutzt das genau so.
 *
 * US-056: Seit dieser Story einmalig in `AdminPageComponent` eingebunden (vormals dupliziert in
 * `UsersAdminComponent` und `ProjectsAdminComponent` über das inzwischen entfernte
 * `AdminSubNavComponent`).
 */
export interface AdminSubNavLink {
  /** Sichtbarer Linktext. */
  readonly label: string;
  /** Ziel-Route für `routerLink`. */
  readonly route: string;
}

/** Sub-Navigationslinks, eingebunden in `AdminPageComponent` (Akzeptanzkriterium 4). */
export const ADMIN_SUB_NAV_LINKS: readonly AdminSubNavLink[] = [
  { label: 'Nutzer', route: '/admin/users' },
  { label: 'Projekte', route: '/admin/projects' },
  { label: 'Kommunikationsarten', route: '/admin/communication-types' },
];

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ADMIN_SUB_NAV_LINKS } from '../admin-nav-items';

/**
 * Sub-Navigation zwischen den Admin-Sub-Bereichen (US-046, PRD Abschnitt 6.2 Screen S5).
 * Eingebunden in `UsersAdminComponent` und `ProjectsAdminComponent`, damit ein Systemadmin
 * zwischen „Nutzer“ und „Projekte“ wechseln kann, ohne zur globalen Navigation zurückzukehren
 * (Akzeptanzkriterium 4). Der aktive Sub-Bereich wird über `routerLinkActive` visuell
 * hervorgehoben, analog zu `project-workspace-layout.component.html` (Akzeptanzkriterium 5).
 * Als eigene Komponente statt dupliziertem Markup in beiden Admin-Komponenten, damit die
 * Sub-Navigation an genau einer Stelle gepflegt wird (siehe `admin-nav-items.ts`).
 */
@Component({
  selector: 'app-admin-sub-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sub-nav.component.html',
  styleUrl: './admin-sub-nav.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSubNavComponent {
  protected readonly links = ADMIN_SUB_NAV_LINKS;
}

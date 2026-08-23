import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { APP_NAV_LINKS, APP_NAV_LOGOUT_LABEL } from './nav-items';

/** Route der Login-Seite — die Navigation bleibt hier immer ausgeblendet (Akzeptanzkriterium 1), siehe {@link AppNavigationComponent.computeVisibility}. */
const LOGIN_ROUTE = '/login';

/**
 * App-weite Navigations-Shell (US-045, PRD Abschnitt 6.3). Ersetzt den bisherigen statischen
 * Titel in `app.html` (Akzeptanzkriterium 1). Sichtbarkeit folgt dem Vorhandensein eines
 * Session-Tokens — eine rein clientseitige UX-Schicht, die die serverseitige Autorisierung nicht
 * ersetzt (CLAUDE.md Abschnitt 3.1, Story-Datei „Wichtige Invarianten“) — UND zusätzlich der
 * aktuellen Route: auf `/login` bleibt die Navigation explizit ausgeblendet, auch wenn (z. B. bei
 * manuellem Aufruf von `/login` durch einen bereits angemeldeten Nutzer) noch ein gültiges Token im
 * `localStorage` liegt — kein Guard verhindert diesen Aufruf, „auf /login bleibt sie ausgeblendet“
 * ist daher eine eigene Bedingung, nicht nur eine Konsequenz aus „kein Token“ (Akzeptanzkriterium
 * 1, verifiziert im lokalen Smoke-Check gegen `docker-compose up`). Die Komponente reagiert auf
 * `NavigationEnd`-Events des Routers, damit ein Login/Logout ohne manuellen Seiten-Reload sofort
 * berücksichtigt wird (Akzeptanzkriterium 3) — `isVisible` ist bewusst ein Signal statt eines
 * einfachen Felds, damit die Aktualisierung trotz `OnPush` zuverlässig ins Template durchschlägt,
 * auch wenn sie aus einem Router-Subscriber statt einem Template-Event stammt.
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-navigation.component.html',
  styleUrl: './app-navigation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavigationComponent {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  /** Konfigurierte Navigationseinträge (US-045/US-046, siehe `nav-items.ts`). */
  protected readonly navLinks = APP_NAV_LINKS;
  protected readonly logoutLabel = APP_NAV_LOGOUT_LABEL;
  protected readonly isVisible = signal(this.computeVisibility());

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.isVisible.set(this.computeVisibility()));
  }

  /**
   * Rein clientseitiges Abmelden (Akzeptanzkriterium 4): Es existiert bewusst kein
   * Backend-Logout-Endpunkt (siehe Story-Datei „Wichtige Invarianten“) — `clearToken()` entfernt
   * das Token aus dem `localStorage`, anschließend Navigation zu `/login`. Ein nachfolgender
   * Aufruf einer geschützten Route greift danach wieder über `authGuard` (Akzeptanzkriterium 5).
   */
  protected onLogout(): void {
    this.tokenStorage.clearToken();
    this.isVisible.set(false);
    void this.router.navigate([LOGIN_ROUTE]);
  }

  private computeVisibility(): boolean {
    return this.hasToken() && !this.router.url.startsWith(LOGIN_ROUTE);
  }

  private hasToken(): boolean {
    return this.tokenStorage.getToken() !== null;
  }
}

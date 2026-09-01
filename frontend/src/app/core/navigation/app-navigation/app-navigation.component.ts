import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { Drawer } from 'primeng/drawer';
import { BrandMarkComponent } from '../../../shared/brand-mark/brand-mark.component';
import { TokenStorageService } from '../../../features/auth/token-storage.service';
import { APP_NAV_ADMIN_LINK, APP_NAV_LINKS, APP_NAV_LOGOUT_LABEL } from './nav-items';

/** US-055 / SPEC-02 §1.4: verbindliche Custom-Query für die Sidebar→Drawer-Umschaltung — deckt
 * sich bewusst NICHT mit PrimeFlex-Standardbreakpoints (siehe dortige Begründung „Variante A"). */
const MOBILE_NAV_QUERY = '(max-width: 959px)';

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
 *
 * US-046: Zusätzlich zu `isVisible` steuert das Signal `isAdmin`, ob der „Admin“-Eintrag gerendert
 * wird (Akzeptanzkriterium 1) — reine clientseitige UX-Schicht über der serverseitigen
 * `SystemAdmin`-Policy und dem clientseitigen `adminGuard` (CLAUDE.md Abschnitt 3.1, Story-Datei
 * „Wichtige Invarianten“), nicht deren Ersatz. Wie `isVisible` wird es bei jedem `NavigationEnd`
 * neu berechnet, damit ein Login als Systemadmin den Eintrag ohne Reload einblendet
 * (Akzeptanzkriterium 2 verlangt zudem, dass der Eintrag bei fehlender Berechtigung vollständig aus
 * dem DOM entfernt wird — nicht nur per CSS versteckt — daher `@if` statt `[hidden]` im Template).
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, Drawer, BrandMarkComponent],
  templateUrl: './app-navigation.component.html',
  styleUrl: './app-navigation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavigationComponent {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** Konfigurierte Navigationseinträge (US-045/US-046, siehe `nav-items.ts`). */
  protected readonly navLinks = APP_NAV_LINKS;
  protected readonly adminLink = APP_NAV_ADMIN_LINK;
  protected readonly logoutLabel = APP_NAV_LOGOUT_LABEL;
  protected readonly isVisible = signal(this.computeVisibility());
  protected readonly isAdmin = signal(this.computeIsAdmin());

  /** US-055 Akzeptanzkriterium 3 / SPEC-02 §1.4 „Variante A": `BreakpointObserver` statt
   * PrimeFlex-Default-Breakpoints, exakte Custom-Query {@link MOBILE_NAV_QUERY}. */
  protected readonly isMobileNav = signal(false);
  /** Sichtbarkeit des mobilen `p-drawer` (unterhalb 960px) — unabhängig von {@link isVisible}. */
  protected readonly drawerOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.isVisible.set(this.computeVisibility());
        this.isAdmin.set(this.computeIsAdmin());
        // Ein Klick auf einen Navigationslink navigiert bereits — der mobile Drawer soll sich
        // danach nicht länger über dem neuen Inhalt befinden.
        this.drawerOpen.set(false);
      });

    this.breakpointObserver
      .observe(MOBILE_NAV_QUERY)
      .pipe(takeUntilDestroyed())
      .subscribe((state) => {
        this.isMobileNav.set(state.matches);
        if (!state.matches) {
          // Zurück zur festen Desktop-Sidebar: ein noch offener Drawer aus dem Mobile-Zustand
          // darf nicht unsichtbar "offen" hängen bleiben.
          this.drawerOpen.set(false);
        }
      });
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
    this.isAdmin.set(false);
    void this.router.navigate([LOGIN_ROUTE]);
  }

  private computeVisibility(): boolean {
    return this.hasToken() && !this.router.url.startsWith(LOGIN_ROUTE);
  }

  private computeIsAdmin(): boolean {
    return this.tokenStorage.getClaims()?.isSystemAdmin === true;
  }

  private hasToken(): boolean {
    return this.tokenStorage.getToken() !== null;
  }
}

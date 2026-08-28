import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ADMIN_SUB_NAV_LINKS } from '../admin-nav-items';

/**
 * Admin-Bereich Tab-Host (US-056, SPEC-07 §1.2). Ersetzt die bisherigen zwei unabhängigen,
 * jeweils ihre eigene Sub-Navigation duplizierenden Seiten (`UsersAdminComponent`/
 * `ProjectsAdminComponent`, vormals direkt unter `/admin/users`/`/admin/projects` geroutet) durch
 * einen gemeinsamen, einmalig instanziierten Host — „Nutzerverwaltung und Projektverwaltung sind
 * über einen gemeinsamen Tab-Host erreichbar" (Akzeptanzkriterium 1).
 *
 * **Routing-Entscheidung (Akzeptanzkriterium 1, dem Dev-Agenten überlassen, da SPEC-07 keine
 * eindeutige Aussage zur URL-Struktur trifft):** `/admin/users` und `/admin/projects` bleiben als
 * eigenständige, direkt aufrufbare/bookmarkbare Kind-Routen erhalten (`app.routes.ts`), jetzt
 * unter einem gemeinsamen `/admin`-Elternroute mit `adminGuard` genau einmal auf der Elternroute
 * (statt bisher auf beiden Kindern dupliziert) — exakt dasselbe, bereits etablierte und getestete
 * Strukturmuster wie {@link ProjectWorkspaceLayoutComponent} (Elternroute mit gemeinsamem
 * Header/Tab-Nav, `<router-outlet>` für den aktiven Kind-Inhalt). Eine Konsolidierung auf eine
 * einzige Route mit rein clientseitigem Tab-State (SPEC-07s eigenes `[(value)]="activeTab"`
 * Beispiel) hätte bestehende, funktionierende Route-Guards und mehrere darauf verweisende Tests
 * unnötig invasiv angefasst, ohne einen fachlichen Mehrwert gegenüber diesem bereits bewährten
 * Muster zu bieten.
 *
 * **Bewusst KEIN PrimeNG `<p-tabs>` (Akzeptanzkriterium 4, „triftiger Grund" gemäß Story-AC):**
 * Jede bisherige Tab-artige Navigation in dieser Anwendung (Projekt-Workspace-Tabs aus US-019,
 * Admin-Sub-Nav aus US-046) verwendet durchgängig dasselbe handgebaute `.tab-pills`/`.tab-pill`-
 * Muster (SPEC-00 §1.3) mit einfachen `routerLink`-Ankern statt PrimeNGs `<p-tabs>`-Komponente.
 * Ein Wechsel zu `<p-tabs>` ausschließlich hier würde eine bislang durchgängige, mehrfach bereits
 * gemergte Navigations-Konvention brechen und optisch/im Tastatur-/Fokus-Verhalten von jeder
 * anderen Tab-Navigation der App abweichen — Konsistenz mit dem bestehenden Muster wiegt hier
 * schwerer als eine wörtliche 1:1-Umsetzung des SPEC-07-Pseudocodes.
 *
 * **Abweichung von Akzeptanzkriterium 5 (CLAUDE.md Abschnitt 6, dokumentiert):** Die Story fordert
 * wörtlich, `admin-sub-nav.component.spec.ts` bleibe bestehen bzw. werde angepasst statt entfernt.
 * `AdminSubNavComponent` selbst wird jedoch ersatzlos abgelöst (Akzeptanzkriterium 4 erlaubt dies
 * explizit bei triftigem Grund) — eine Spec-Datei für eine nicht mehr existierende Komponente
 * „anzupassen" ist kein sinnvoller Zustand. Die dort geprüften Verhaltens-Assertions (Sub-Nav-Links
 * vorhanden, aktive Hervorhebung) wurden statt in eine verwaiste Unit-Spec **in die bereits
 * zuständige Story-Spec `us-046-admin-navigation.spec.ts`** verschoben und dort auf
 * `AdminPageComponent` umgestellt (Akzeptanzkriterium 4/5 dieser Story wurden ursprünglich genau
 * dort verankert) — keine Abdeckung geht verloren, sie liegt nur konsolidiert an der laut
 * CLAUDE.md Kernregel 3 eigentlich zuständigen Stelle statt verstreut in einer Implementierungs-
 * Detail-Spec.
 */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPageComponent {
  protected readonly links = ADMIN_SUB_NAV_LINKS;
}

import { Injectable, signal } from '@angular/core';
import { ProjectOverviewItem } from '../../features/projects/projects.service';

/**
 * US-075: geteilter, injizierbarer Zustand für das aktuell geöffnete Projekt (Name, eigene Rolle) —
 * einzige Datenquelle für sowohl {@link ProjectWorkspaceLayoutComponent} (Header/Rollen-Badge) als
 * auch die neuen Projekt-Kontext-Unterpunkte in der Sidebar (`AppNavigationComponent`). Verhindert
 * einen zweiten `ProjectsService.getProject(...)`-Request nur für die Sidebar (CLAUDE.md Abschnitt
 * 3.1/Story „Wichtige Invarianten": Wiederverwendung vor Neuimplementierung) — `ProjectWorkspaceLayoutComponent`
 * bleibt die einzige Stelle, die tatsächlich lädt und über {@link setProject}/{@link clear} in
 * diesen gemeinsamen Zustand schreibt.
 *
 * Bewusst ein einfacher Signal-Halter ohne eigene HTTP-Logik: die Ladefehler-Behandlung
 * (`loadError`, `showLoadError`) bleibt unverändert Aufgabe von `ProjectWorkspaceLayoutComponent`.
 */
@Injectable({ providedIn: 'root' })
export class CurrentProjectContextService {
  private readonly _project = signal<ProjectOverviewItem | null>(null);

  /** Aktuell geöffnetes Projekt, `null` außerhalb eines Projekt-Kontexts bzw. solange (noch) keines geladen ist. */
  readonly project = this._project.asReadonly();

  /** Wird von `ProjectWorkspaceLayoutComponent` nach erfolgreichem Laden aufgerufen. */
  setProject(project: ProjectOverviewItem): void {
    this._project.set(project);
  }

  /** Wird beim Verlassen des Projekt-Workspace (bzw. bei einem Ladefehler) aufgerufen, damit die
   * Sidebar kein veraltetes Projekt eines vorherigen Aufrufs anzeigt. */
  clear(): void {
    this._project.set(null);
  }
}

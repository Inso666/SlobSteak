import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * US-047 / SPEC-00 §1.3 „.attention“: wiederverwendbarer Baustein für „braucht
 * Aufmerksamkeit“-Hinweise (Punkt + Text auf `--app-attention-bg`). Kein reines
 * PrimeNG-Standardelement (kombiniert Punkt + Badge-Fläche), daher als eigenständiger,
 * projektweiter Wrapper gebaut statt pro Screen neu implementiert (SPEC-00 §1.3).
 *
 * Erster Verwendungsort (Akzeptanzkriterium 3 dieser Story): Hinweis auf einen bereits
 * existierenden, ähnlichen Stakeholder beim Anlegen ({@link CreateStakeholderFormComponent}) —
 * ein Signal, das tatsächlich Handlungsbedarf ausdrückt (mögliches Duplikat prüfen), und damit ein
 * fachlich sinnvollerer Kandidat als ein aktuell nicht in der Stakeholder-Liste verfügbares
 * „ohne Assessment“-Flag (die Liste liefert serverseitig keinen Bewertungsstatus je Stakeholder,
 * siehe Anmerkungen des Dev-Agenten in der Story-Datei).
 */
@Component({
  selector: 'app-attention-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attention-badge.component.html',
  styleUrl: './attention-badge.component.css',
})
export class AttentionBadgeComponent {
  @Input({ required: true }) text!: string;
}

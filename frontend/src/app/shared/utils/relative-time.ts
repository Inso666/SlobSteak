/**
 * Formatiert einen ISO-Zeitstempel als deutsche relative Zeitangabe („vor 2 Std.“/„vor 1 Tag“/…).
 * Zentral gehalten (frontend.md Abschnitt 3), da sowohl die Stakeholder-Liste (US-072,
 * `updatedAt`-Spalte) als auch die Projektübersicht (US-076, Kartenfußzeile „Aktualisiert vor …“)
 * exakt dieselbe Umrechnung benötigen — ursprünglich in `StakeholderListComponent` eingeführt und
 * mit dieser Story hierher extrahiert, um die zweite Kopie zu vermeiden.
 */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'gerade eben';
  }
  if (minutes < 60) {
    return `vor ${minutes} Min.`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `vor ${hours} Std.`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'vor 1 Tag';
  }
  if (days < 7) {
    return `vor ${days} Tagen`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks === 1) {
    return 'vor 1 Woche';
  }
  if (weeks < 5) {
    return `vor ${weeks} Wochen`;
  }
  const months = Math.floor(days / 30);
  return months <= 1 ? 'vor 1 Monat' : `vor ${months} Monaten`;
}

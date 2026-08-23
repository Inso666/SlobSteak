/**
 * Zentrale Wortlaute für das globale HTTP-Error-Handling (US-044). An einer Stelle gehalten
 * (frontend.md Abschnitt 2: „UI-Texte werden nicht verteilt hartcodiert“), damit Wording-Anpassungen
 * nicht in `http-error.interceptor.ts` und den fünf betroffenen Komponenten parallel gepflegt werden
 * müssen.
 */

/** Hinweistext nach automatischer Weiterleitung zu `/login` bei HTTP 401 (Akzeptanzkriterium 2). */
export const SESSION_EXPIRED_MESSAGE = 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.';

/** Konsistente Fehlermeldung für fehlgeschlagene lesende (GET-)Requests (Akzeptanzkriterium 4). */
export const LOAD_ERROR_MESSAGE = 'Daten konnten nicht geladen werden. Bitte versuche es erneut.';

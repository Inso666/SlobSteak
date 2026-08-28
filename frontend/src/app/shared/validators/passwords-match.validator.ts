import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * US-054 / SPEC-01 §2.2: Cross-Field-`ValidatorFn` auf `FormGroup`-Ebene, die bei Ungleichheit von
 * `passwordControlName` und `confirmControlName` den Fehler `passwordMismatch` **auf der
 * Bestätigungs-Control** setzt (nicht nur auf der Gruppe) — nur so lässt sich der Fehler nach dem
 * etablierten SPEC-00 §2-Muster (Feldrahmen + Text direkt unter dem betroffenen Feld) darstellen,
 * statt nur als unspezifischer Gruppenfehler ohne Feldbezug.
 *
 * Bewusst wiederverwendbar (nicht nur inline im Passwort-Änderungs-Dialog), damit ein künftiger
 * zweiter Bestätigungsfeld-Fall (z. B. ein potenzielles Self-Service-Reset, PRD Abschnitt 1.4
 * aktuell außerhalb des MVP-Scopes) dieselbe Regel nutzt statt sie zu duplizieren.
 */
export function passwordsMatchValidator(passwordControlName: string, confirmControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const passwordControl = group.get(passwordControlName);
    const confirmControl = group.get(confirmControlName);
    if (!passwordControl || !confirmControl) {
      return null;
    }

    // Andere, bereits vorhandene Fehler (z. B. `required`) bleiben unangetastet — nur der eigene
    // `passwordMismatch`-Schlüssel wird hier gesetzt bzw. wieder entfernt.
    const otherErrors: ValidationErrors = { ...confirmControl.errors };
    delete otherErrors['passwordMismatch'];

    if (passwordControl.value !== confirmControl.value) {
      confirmControl.setErrors({ ...otherErrors, passwordMismatch: true });
      return { passwordMismatch: true };
    }

    confirmControl.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
    return null;
  };
}

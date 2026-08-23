import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppNavigationComponent } from './core/navigation/app-navigation/app-navigation.component';

/**
 * Composition Root (US-045): bindet die app-weite Navigations-Shell {@link AppNavigationComponent}
 * ein, die den bisherigen statischen Titel ersetzt (Akzeptanzkriterium 1). Die
 * Sichtbarkeits-/Logout-Logik lebt vollständig in der Navigationskomponente selbst.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppNavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}

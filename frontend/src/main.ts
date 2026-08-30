import { bootstrapApplication } from '@angular/platform-browser';
import { createAppConfig } from './app/app.config';
import { App } from './app/app';
import { fetchPrimeNgLicenseKey } from './app/core/config/primeng-license';

// US-048: Der PrimeNG-Lizenzschlüssel wird VOR dem Angular-Bootstrap serverseitig abgefragt (siehe
// core/config/primeng-license.ts für die Begründung, warum dies vor statt innerhalb des
// Angular-Bootstraps geschehen muss). Ein fehlgeschlagener/leerer Abruf blockiert den Start nicht —
// `fetchPrimeNgLicenseKey` liefert in diesem Fall `null`.
fetchPrimeNgLicenseKey()
  .then((primeNgLicenseKey) => bootstrapApplication(App, createAppConfig(primeNgLicenseKey)))
  .catch((err) => console.error(err));

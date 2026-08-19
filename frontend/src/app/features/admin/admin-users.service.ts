import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

/**
 * Injizierbarer Service für den Admin-Bereich „Nutzerverwaltung“ (US-016). Alle HTTP-Zugriffe
 * laufen ausschließlich über diese Klasse, nie direkt aus einer Komponente (CLAUDE.md
 * Abschnitt 3.1).
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/admin/users';

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.baseUrl);
  }

  createUser(name: string, email: string, initialPassword: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.baseUrl, { name, email, initialPassword });
  }

  resetPassword(userId: string, temporaryPassword: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${userId}/reset-password`, { temporaryPassword });
  }
}

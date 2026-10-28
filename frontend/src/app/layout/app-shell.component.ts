import { Component, HostListener, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { LoginComponent } from '../features/login/login.component';

const TABS = ['resumen', 'inventario', 'movimientos', 'cibercafe', 'historial'] as const;
type Tab = (typeof TABS)[number];

@Component({
  selector: 'app-shell',
  imports: [LoginComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  readonly activeTab = signal<Tab>(this.readTab());
  readonly themeLabel = signal('Modo oscuro');

  constructor() {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      this.themeLabel.set('Modo claro');
  }

  selectTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (window.location.hash !== `#${tab}`) window.history.replaceState(null, '', `#${tab}`);
  }

  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch {
      /* El servicio conserva el error visible en el estado de acceso. */
    }
  }

  toggleTheme(): void {
    const root = document.documentElement;
    const isDark =
      root.dataset['theme'] === 'dark' ||
      (!root.dataset['theme'] &&
        Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches));
    root.dataset['theme'] = isDark ? 'light' : 'dark';
    this.themeLabel.set(isDark ? 'Modo oscuro' : 'Modo claro');
  }

  @HostListener('window:hashchange')
  onHashChange(): void {
    this.activeTab.set(this.readTab());
  }

  private readTab(): Tab {
    const fragment = window.location.hash.slice(1);
    const tab = TABS.find((candidate) => candidate === fragment) ?? 'resumen';
    if (window.location.hash !== `#${tab}`) window.history.replaceState(null, '', `#${tab}`);
    return tab;
  }
}

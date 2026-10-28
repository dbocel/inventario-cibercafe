import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  let auth: any;
  beforeEach(() => {
    auth = {
      currentUser: signal({ id: 'user-1', email: 'admin@example.test' }),
      currentRole: signal('admin'),
      error: signal<string | null>(null),
      loading: signal(false),
      signOut: vi.fn(async () => {
        auth.currentUser.set(null);
        auth.currentRole.set(null);
      }),
    };
    TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  it.each(['resumen', 'inventario', 'movimientos', 'cibercafe', 'historial'])(
    'selects the %s fragment',
    async (tab) => {
      window.history.replaceState(null, '', `#${tab}`);
      const fixture = TestBed.createComponent(AppShellComponent);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.activeTab()).toBe(tab);
      expect(window.location.hash).toBe(`#${tab}`);
      expect(
        fixture.nativeElement.querySelector(`[data-tab="${tab}"]`)?.getAttribute('aria-selected'),
      ).toBe('true');
    },
  );

  it('defaults to resumen for an unknown fragment and updates the hash on navigation', () => {
    window.history.replaceState(null, '', '#unknown');
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab()).toBe('resumen');
    fixture.nativeElement.querySelector('[data-tab="inventario"]').click();
    fixture.detectChanges();
    expect(window.location.hash).toBe('#inventario');
  });

  it('gates the shell behind login and hides admin controls for a cajero', () => {
    auth.currentUser.set(null);
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-login')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeNull();

    auth.currentUser.set({ id: 'cashier' });
    auth.currentRole.set('cajero');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-login')).toBeNull();
    expect(fixture.nativeElement.querySelector('#btnNew')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rates')).toBeNull();
  });

  it('keeps the reference navigation labels and signs out', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(
      'Cibercafé y Papelería K-ROL',
    );
    const labels = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]')).map(
      (button: any) => button.textContent.trim(),
    );
    expect(labels).toEqual([
      'Resumen',
      'Inventario',
      'Registrar movimiento',
      'Cibercafé',
      'Historial',
    ]);
    await fixture.componentInstance.logout();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('toggles the existing in-memory light and dark theme', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('#btnTheme').click();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    fixture.nativeElement.querySelector('#btnTheme').click();
    expect(document.documentElement.dataset['theme']).toBe('light');
    delete document.documentElement.dataset['theme'];
  });
});

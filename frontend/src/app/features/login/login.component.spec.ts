import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('keeps the password on failure and exposes a busy login form', async () => {
    const auth = {
      loading: signal(false),
      error: signal<string | null>(null),
      signIn: vi.fn(async () => {
        auth.loading.set(true);
        auth.error.set('Correo o contraseña incorrectos.');
        throw new Error('failed');
      }),
    };
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.email = 'usuario@example.test';
    fixture.componentInstance.password = 'secreto';
    await fixture.componentInstance.submit(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.componentInstance.password).toBe('secreto');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Correo o contraseña',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(auth.signIn).toHaveBeenCalledWith('usuario@example.test', 'secreto');
  });

  it('clears the password only after authentication succeeds', async () => {
    const auth = {
      loading: signal(false),
      error: signal<string | null>(null),
      signIn: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.password = 'correcta';

    await fixture.componentInstance.submit(new Event('submit'));

    expect(fixture.componentInstance.password).toBe('');
  });
});

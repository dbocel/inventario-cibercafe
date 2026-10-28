import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            currentRole: signal(null),
            error: signal(null),
            loading: signal(false),
            initialize: vi.fn(async () => undefined),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('initializes authentication and muestra el gate de acceso', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login')).not.toBeNull();
    expect(TestBed.inject(AuthService).initialize).toHaveBeenCalledOnce();
  });
});

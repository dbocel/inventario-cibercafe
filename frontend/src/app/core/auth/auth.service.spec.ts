import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let client: any;

  beforeEach(() => {
    client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { rol: 'admin' }, error: null }),
          }),
        }),
      }),
    };
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: SupabaseClientService, useValue: { client } }],
    });
    service = TestBed.inject(AuthService);
  });

  it('signs in from the returned user and loads that user profile without getUser', async () => {
    const user = { id: 'user-1', email: 'cajero@example.test' };
    client.auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });

    await service.signIn('cajero@example.test', 'password');

    expect(client.from).toHaveBeenCalledWith('perfiles');
    expect(service.currentUser()).toEqual(user);
    expect(service.currentRole()).toBe('admin');
    expect(client.auth.getUser).toBeUndefined();
  });

  it('restores access from getSession session.user without requiring getUser', async () => {
    const user = { id: 'restored-user', email: 'admin@example.test' };
    client.auth.getSession.mockResolvedValue({ data: { session: { user } }, error: null });

    await service.initialize();

    expect(service.currentUser()).toEqual(user);
    expect(service.currentRole()).toBe('admin');
    expect(client.auth.getUser).toBeUndefined();
  });

  it('clears auth state and requires login when there is no session', async () => {
    await service.initialize();

    expect(service.currentUser()).toBeNull();
    expect(service.currentRole()).toBeNull();
    expect(service.error()).toContain('sesión');
  });

  it('shows invalid credentials and does not authenticate', async () => {
    client.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(service.signIn('x@example.test', 'bad')).rejects.toThrow();

    expect(service.currentUser()).toBeNull();
    expect(service.error()).toContain('Correo o contraseña');
    expect(client.auth.getUser).toBeUndefined();
  });

  it('makes profile lookup errors visible and does not grant a role', async () => {
    const user = { id: 'user-1', email: 'x@example.test' };
    client.auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    client.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'offline' } }) }),
      }),
    });

    await expect(service.signIn('x@example.test', 'password')).rejects.toThrow();

    expect(service.currentRole()).toBeNull();
    expect(service.error()).toContain('perfil');
  });

  it('signs out and clears local authenticated state', async () => {
    const user = { id: 'user-1', email: 'x@example.test' };
    client.auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    await service.signIn('x@example.test', 'password');

    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalledOnce();
    expect(service.currentUser()).toBeNull();
    expect(service.currentRole()).toBeNull();
  });
});

import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let client: any;

  beforeEach(() => {
    client = {
      auth: {
        onAuthStateChange: vi
          .fn()
          .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
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

  it('clears access on signed-out and rejects a late profile from the old session', async () => {
    let finish!: (value: unknown) => void;
    client.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'old' } },
      error: null,
    });
    client.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: () => new Promise((r) => (finish = r)) }) }),
    });
    const pending = service.signIn('x@example.test', 'password').catch(() => undefined);
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const listener = client.auth.onAuthStateChange.mock.calls[0]?.[0];
    expect(listener).toBeTypeOf('function');
    listener('SIGNED_OUT', null);
    finish({ data: { rol: 'admin' }, error: null });
    await pending;
    expect(service.currentUser()).toBeNull();
    expect(service.currentRole()).toBeNull();
  });

  it.each(['session', 'signIn', 'profile'])(
    'bounds a never-resolving %s wait and permits retry',
    async (stage) => {
      vi.useFakeTimers();
      try {
        const never = new Promise(() => {});
        client.auth.getSession.mockReturnValue(
          stage === 'session'
            ? never
            : Promise.resolve({ data: { session: { user: { id: 'a' } } }, error: null }),
        );
        client.auth.signInWithPassword.mockReturnValue(never);
        if (stage === 'profile')
          client.from.mockReturnValue({
            select: () => ({ eq: () => ({ maybeSingle: () => never }) }),
          });
        const pending =
          stage === 'signIn'
            ? service.signIn('x@example.test', 'p').catch(() => {})
            : service.initialize();
        await vi.advanceTimersByTimeAsync(15001);
        expect(service.loading()).toBe(false);
        expect(service.error()).toMatch(/tiempo|Tiempo/);
        await pending;
        client.from.mockReturnValue({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { rol: 'cajero' }, error: null }) }),
          }),
        });
        client.auth.signInWithPassword.mockResolvedValue({
          data: { user: { id: 'retry' } },
          error: null,
        });
        await service.signIn('x@example.test', 'p');
        expect(service.currentUser()?.id).toBe('retry');
        expect(service.error()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('restores a changed session and clears access when token refresh has no session', async () => {
    client.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'a' } }, error: null });
    await service.signIn('x@example.test', 'p');
    const listener = client.auth.onAuthStateChange.mock.calls[0][0];
    listener('SIGNED_IN', { user: { id: 'b' } });
    expect(service.currentUser()).toBeNull();
    expect(service.currentRole()).toBeNull();
    await vi.waitFor(() => expect(service.currentUser()?.id).toBe('b'));
    listener('TOKEN_REFRESHED', null);
    expect(service.currentUser()).toBeNull();
    expect(service.currentRole()).toBeNull();
    expect(service.error()).toContain('sesión');
  });

  it('uses the newest external session even while an older profile is pending', async () => {
    let oldProfile!: (value: unknown) => void;
    client.from.mockImplementation(() => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: () =>
            id === 'old'
              ? new Promise((r) => (oldProfile = r))
              : Promise.resolve({ data: { rol: 'cajero' }, error: null }),
        }),
      }),
    }));
    const listener = client.auth.onAuthStateChange.mock.calls[0][0];
    listener('SIGNED_IN', { user: { id: 'old' } });
    await vi.waitFor(() => expect(oldProfile).toBeTypeOf('function'));
    listener('SIGNED_IN', { user: { id: 'new' } });
    oldProfile({ data: { rol: 'admin' }, error: null });
    await vi.waitFor(() => expect(service.currentUser()?.id).toBe('new'));
    expect(service.currentRole()).toBe('cajero');
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

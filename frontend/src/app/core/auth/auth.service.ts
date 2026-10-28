import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SupabaseClientService } from '../supabase/supabase-client.service';

export interface AuthUser {
  id: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(null);
  readonly currentRole = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  private revision = 0;
  private profileUserId: string | null = null;
  private signingInEmail: string | null = null;

  constructor(private readonly supabase: SupabaseClientService) {
    const { data } = this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        this.revision++;
        this.clearAuth();
        this.loading.set(false);
        this.error.set('La sesión terminó. Inicie sesión nuevamente.');
      } else if (
        !(this.signingInEmail && session.user.email?.toLowerCase() === this.signingInEmail) &&
        !(event === 'INITIAL_SESSION' && this.loading()) &&
        session.user.id !== (this.profileUserId ?? this.currentUser()?.id)
      ) {
        // No consultar Supabase dentro de su callback: Auth mantiene un bloqueo.
        const revision = ++this.revision;
        this.clearAuth();
        this.profileUserId = session.user.id;
        this.loading.set(true);
        queueMicrotask(() => void this.restoreUser(session.user, revision));
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.revision++;
      data.subscription.unsubscribe();
    });
  }

  private async restoreUser(user: AuthUser, revision: number): Promise<void> {
    try {
      await this.loadProfile(user, revision);
    } catch (error) {
      if (revision === this.revision) {
        this.clearAuth();
        this.error.set(this.profileError(error));
      }
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }

  async initialize(): Promise<void> {
    const revision = ++this.revision;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.bounded(this.supabase.client.auth.getSession());
      if (revision !== this.revision) return;
      if (error) throw error;
      if (!data.session?.user) {
        this.clearAuth();
        this.error.set('No hay una sesión activa. Inicie sesión para continuar.');
        return;
      }
      await this.loadProfile(data.session.user as AuthUser, revision);
    } catch (error) {
      if (revision !== this.revision) return;
      this.clearAuth();
      this.error.set(this.profileError(error));
    } finally {
      if (revision === this.revision) this.loading.set(false);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const revision = ++this.revision;
    this.signingInEmail = email.trim().toLowerCase();
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.bounded(
        this.supabase.client.auth.signInWithPassword({
          email,
          password,
        }),
      );
      if (revision !== this.revision) throw new Error('La sesión cambió. Intente nuevamente.');
      if (error) {
        this.clearAuth();
        this.error.set('Correo o contraseña incorrectos.');
        throw new Error(this.error() ?? 'No se pudo iniciar sesión.');
      }
      if (!data.user) throw new Error('No se recibió el usuario autenticado.');
      await this.loadProfile(data.user as AuthUser, revision);
    } catch (error) {
      if (revision !== this.revision) throw error;
      if (!this.error()) this.error.set(this.profileError(error));
      this.clearAuth();
      throw error instanceof Error
        ? error
        : new Error(this.error() ?? 'No se pudo iniciar sesión.');
    } finally {
      if (revision === this.revision) {
        this.signingInEmail = null;
        this.loading.set(false);
      }
    }
  }

  async signOut(): Promise<void> {
    this.revision++;
    this.clearAuth();
    this.loading.set(true);
    try {
      const { error } = await this.bounded(this.supabase.client.auth.signOut());
      if (error) throw error;
      this.clearAuth();
      this.error.set(null);
    } catch (error) {
      this.clearAuth();
      this.error.set('No se pudo cerrar la sesión. Intente de nuevo.');
      throw error instanceof Error ? error : new Error(this.error()!);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadProfile(user: AuthUser, revision: number): Promise<void> {
    if (revision !== this.revision) return;
    this.profileUserId = user.id;
    const { data, error } = await this.bounded(
      this.supabase.client.from('perfiles').select('rol').eq('usuario_id', user.id).maybeSingle(),
    );
    if (revision !== this.revision) throw new Error('La sesión cambió. Intente nuevamente.');
    if (error || !data?.rol) {
      this.clearAuth();
      this.error.set('No se pudo cargar el perfil de acceso. Contacte al administrador.');
      throw new Error(this.error() ?? 'No se pudo cargar el perfil.');
    }
    this.currentUser.set(user);
    this.currentRole.set(data.rol);
  }

  private clearAuth(): void {
    this.profileUserId = null;
    this.signingInEmail = null;
    this.currentUser.set(null);
    this.currentRole.set(null);
  }

  private async bounded<T>(request: PromiseLike<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        Promise.resolve(request),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Tiempo de espera agotado. Intente iniciar sesión nuevamente.')),
            15_000,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private profileError(error: unknown): string {
    if (error instanceof Error && error.message.includes('Tiempo')) return error.message;
    return 'No se pudo restaurar la sesión o cargar el perfil. Inicie sesión nuevamente.';
  }
}

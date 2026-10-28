import { Injectable, signal } from '@angular/core';
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

  constructor(private readonly supabase: SupabaseClientService) {}

  async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client.auth.getSession();
      if (error) throw error;
      if (!data.session?.user) {
        this.clearAuth();
        this.error.set('No hay una sesión activa. Inicie sesión para continuar.');
        return;
      }
      await this.loadProfile(data.session.user as AuthUser);
    } catch (error) {
      this.clearAuth();
      this.error.set(this.profileError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        this.clearAuth();
        this.error.set('Correo o contraseña incorrectos.');
        throw new Error(this.error() ?? 'No se pudo iniciar sesión.');
      }
      if (!data.user) throw new Error('No se recibió el usuario autenticado.');
      await this.loadProfile(data.user as AuthUser);
    } catch (error) {
      if (!this.error()) this.error.set(this.profileError(error));
      this.clearAuth();
      throw error instanceof Error
        ? error
        : new Error(this.error() ?? 'No se pudo iniciar sesión.');
    } finally {
      this.loading.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client.auth.signOut();
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

  private async loadProfile(user: AuthUser): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('perfiles')
      .select('rol')
      .eq('usuario_id', user.id)
      .maybeSingle();
    if (error || !data?.rol) {
      this.clearAuth();
      this.error.set('No se pudo cargar el perfil de acceso. Contacte al administrador.');
      throw new Error(this.error() ?? 'No se pudo cargar el perfil.');
    }
    this.currentUser.set(user);
    this.currentRole.set(data.rol);
  }

  private clearAuth(): void {
    this.currentUser.set(null);
    this.currentRole.set(null);
  }

  private profileError(_error: unknown): string {
    return 'No se pudo restaurar la sesión o cargar el perfil. Inicie sesión nuevamente.';
  }
}

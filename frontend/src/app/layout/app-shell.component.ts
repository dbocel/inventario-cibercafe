import {
  afterNextRender,
  Component,
  effect,
  HostListener,
  inject,
  Injector,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { LoginComponent } from '../features/login/login.component';
import { InventoryDataService, AppData } from '../core/data/inventory-data.service';
import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { InventoryComponent } from '../features/inventory/inventory.component';
import { HistoryComponent } from '../features/history/history.component';
import { MovementsComponent } from '../features/movements/movements.component';
import { CybercafeComponent } from '../features/cybercafe/cybercafe.component';
import { ModalDirective } from '../shared/modal.directive';

const TABS = ['resumen', 'inventario', 'movimientos', 'cibercafe', 'historial'] as const;
type Tab = (typeof TABS)[number];
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const IDLE_COUNTDOWN_SECONDS = 15;

@Component({
  selector: 'app-shell',
  imports: [
    LoginComponent,
    DashboardComponent,
    InventoryComponent,
    HistoryComponent,
    MovementsComponent,
    CybercafeComponent,
    ModalDirective,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly dataService = inject(InventoryDataService);
  private readonly injector = inject(Injector);
  readonly appData = signal<AppData | null>(null);
  readonly dataLoading = signal(false);
  readonly dataError = signal('');
  readonly activeTab = signal<Tab>(this.readTab());
  readonly themeLabel = signal('Modo oscuro');
  readonly idleModalOpen = signal(false);
  readonly idleCountdown = signal(IDLE_COUNTDOWN_SECONDS);
  private loadRevision = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private countdownTimer: ReturnType<typeof setInterval> | undefined;
  private lastActivityAt = Date.now();
  private readonly onUserActivity = (): void => this.handleUserActivity();
  readonly reloadData = () => this.loadData(true);
  @ViewChild(MovementsComponent) private movements?: MovementsComponent;

  openMovement(productId: number, type?: 'entrada' | 'salida'): void {
    if (!this.movements) return;
    this.movements.selectProduct(productId, type ?? this.movements.type);
    this.selectTab('movimientos');
    afterNextRender(() => this.movements?.focusQuantity(), { injector: this.injector });
  }

  constructor() {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      this.themeLabel.set('Modo claro');
    effect(() => {
      if (this.auth.currentUser()) {
        this.appData.set(null);
        void this.loadData();
        this.startIdleTracking();
      } else {
        this.loadRevision++;
        this.stopIdleTracking();
        const svc: any = this.dataService;
        if (typeof svc.clearCache === 'function') svc.clearCache();
        this.appData.set(null);
        this.dataError.set('');
        this.dataLoading.set(false);
      }
    });
  }

  async loadData(forceRefresh = false): Promise<void> {
    const user = this.auth.currentUser();
    const revision = ++this.loadRevision;
    if (!user) return;
    this.dataLoading.set(true);
    this.dataError.set('');
    const svc: any = this.dataService;
    try {
      if (forceRefresh && typeof svc.clearCache === 'function') svc.clearCache();
      if (!forceRefresh && typeof svc.getCached === 'function') {
        const cached = svc.getCached();
        if (cached) {
          if (revision === this.loadRevision && this.auth.currentUser()?.id === user.id) {
            this.appData.set(cached);
            this.dataLoading.set(false);
          }
          return;
        }
      }
      if (typeof svc.loadCritical === 'function' && typeof svc.loadDeferred === 'function') {
        const critical = await svc.loadCritical();
        if (revision !== this.loadRevision || this.auth.currentUser()?.id !== user.id) return;
        this.appData.set({
          ...critical,
          products: [],
          movements: [],
          sessions: [],
          equipment: [],
          configuration: null,
        });
        const deferred = await svc.loadDeferred();
        const current = this.appData();
        if (
          !current ||
          revision !== this.loadRevision ||
          this.auth.currentUser()?.id !== user.id
        )
          return;
        const merged = {
          ...current,
          products: deferred.products,
          movements: deferred.movements,
          sessions: deferred.sessions,
          equipment: deferred.equipment,
          configuration: deferred.configuration,
        };
        this.appData.set(merged);
        if (typeof svc.setCached === 'function') svc.setCached(merged);
      } else {
        const data = await this.dataService.loadAll();
        if (revision === this.loadRevision && this.auth.currentUser()?.id === user.id)
          this.appData.set(data);
      }
    } catch (error) {
      if (revision !== this.loadRevision || this.auth.currentUser()?.id !== user.id) return;
      if (!this.appData()) this.appData.set(null);
      this.dataError.set(
        error instanceof Error ? error.message : 'No se pudieron cargar los datos.',
      );
    } finally {
      if (revision === this.loadRevision) this.dataLoading.set(false);
    }
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

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState !== 'visible') return;
    if (!this.auth.currentUser() || this.idleModalOpen()) return;
    if (Date.now() - this.lastActivityAt >= IDLE_TIMEOUT_MS) this.openIdleModal();
  }

  ngOnDestroy(): void {
    this.stopIdleTracking();
  }

  staySignedIn(): void {
    this.idleModalOpen.set(false);
    this.stopCountdown();
    this.resetIdleTimer();
  }

  async logoutFromIdle(): Promise<void> {
    this.idleModalOpen.set(false);
    this.stopCountdown();
    await this.logout();
  }

  private startIdleTracking(): void {
    if (this.idleTimer) return;
    this.lastActivityAt = Date.now();
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    events.forEach((event) => window.addEventListener(event, this.onUserActivity, { passive: true }));
    this.resetIdleTimer();
  }

  private stopIdleTracking(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
    this.stopCountdown();
    this.idleModalOpen.set(false);
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    events.forEach((event) => window.removeEventListener(event, this.onUserActivity));
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.auth.currentUser() || this.idleModalOpen()) return;
    this.idleTimer = setTimeout(() => this.openIdleModal(), IDLE_TIMEOUT_MS);
  }

  private handleUserActivity(): void {
    if (!this.auth.currentUser() || this.idleModalOpen()) return;
    const now = Date.now();
    if (now - this.lastActivityAt < 2000) return;
    this.lastActivityAt = now;
    this.resetIdleTimer();
  }

  private openIdleModal(): void {
    if (!this.auth.currentUser() || this.idleModalOpen()) return;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
    this.idleCountdown.set(IDLE_COUNTDOWN_SECONDS);
    this.idleModalOpen.set(true);
    this.startCountdown();
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.countdownTimer = setInterval(() => {
      const next = this.idleCountdown() - 1;
      this.idleCountdown.set(next);
      if (next <= 0) {
        this.stopCountdown();
        this.idleModalOpen.set(false);
        void this.logout();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }

  private readTab(): Tab {
    const hash = window.location.hash;
    const fragment = hash.slice(1);
    if (
      fragment.startsWith('access_token=') ||
      fragment.startsWith('error=') ||
      fragment.startsWith('error_description=') ||
      fragment.includes('access_token=') ||
      fragment.includes('refresh_token=') ||
      fragment.includes('error_description=')
    ) {
      return 'resumen';
    }
    const tab = TABS.find((candidate) => candidate === fragment) ?? 'resumen';
    if (hash !== `#${tab}`) window.history.replaceState(null, '', `#${tab}`);
    return tab;
  }
}

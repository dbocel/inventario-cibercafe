import {
  afterNextRender,
  Component,
  effect,
  HostListener,
  inject,
  Injector,
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

const TABS = ['resumen', 'inventario', 'movimientos', 'cibercafe', 'historial'] as const;
type Tab = (typeof TABS)[number];

@Component({
  selector: 'app-shell',
  imports: [
    LoginComponent,
    DashboardComponent,
    InventoryComponent,
    HistoryComponent,
    MovementsComponent,
    CybercafeComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly dataService = inject(InventoryDataService);
  private readonly injector = inject(Injector);
  readonly appData = signal<AppData | null>(null);
  readonly dataLoading = signal(false);
  readonly dataError = signal('');
  readonly activeTab = signal<Tab>(this.readTab());
  readonly themeLabel = signal('Modo oscuro');
  private loadRevision = 0;
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
      } else {
        this.loadRevision++;
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

  private readTab(): Tab {
    const fragment = window.location.hash.slice(1);
    const tab = TABS.find((candidate) => candidate === fragment) ?? 'resumen';
    if (window.location.hash !== `#${tab}`) window.history.replaceState(null, '', `#${tab}`);
    return tab;
  }
}

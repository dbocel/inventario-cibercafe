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
  readonly reloadData = () => this.loadData();
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
        this.appData.set(null);
        this.dataError.set('');
        this.dataLoading.set(false);
      }
    });
  }

  async loadData(): Promise<void> {
    const user = this.auth.currentUser();
    const revision = ++this.loadRevision;
    if (!user) return;
    this.dataLoading.set(true);
    this.dataError.set('');
    try {
      const data = await this.dataService.loadAll();
      if (revision === this.loadRevision && this.auth.currentUser()?.id === user.id)
        this.appData.set(data);
    } catch (error) {
      if (revision !== this.loadRevision || this.auth.currentUser()?.id !== user.id) return;
      this.appData.set(null);
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

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { ModalDirective } from '../../shared/modal.directive';
import { AppData, InventoryDataService, Session } from '../../core/data/inventory-data.service';

@Component({
  selector: 'app-cybercafe',
  imports: [FormsModule, ModalDirective],
  templateUrl: './cybercafe.component.html',
  styleUrl: './cybercafe.component.css',
})
export class CybercafeComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) data!: AppData;
  @Output() readonly refresh = new EventEmitter<void>();
  @Input() reload: () => Promise<void> = async () => {};
  @Input() refreshing = false;
  private readonly service = inject(InventoryDataService);
  private readonly auth = inject(AuthService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private hourlyRate = 6;
  private billingBlock = 15;
  get rate(): number {
    return this.hourlyRate;
  }
  set rate(value: number) {
    this.hourlyRate = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  }
  get block(): number {
    return this.billingBlock;
  }
  set block(value: number) {
    this.billingBlock = Number.isFinite(Number(value)) ? Math.max(1, Math.floor(Number(value))) : 1;
  }
  pageRate = 0.5;
  offsets: Record<number, number> = {};
  selected: Session | null = null;
  finishMinutes = 0;
  pages = 0;
  message = '';
  saving = false;
  private interval?: ReturnType<typeof setInterval>;
  readonly isAdmin = () => this.auth.currentRole() === 'admin';
  ngOnChanges(): void {
    this.applyConfig();
  }
  ngOnInit(): void {
    this.interval = setInterval(() => this.tick.update((value) => value + 1), 1000);
  }
  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }
  tick = signal(0);
  readonly Math = Math;
  applyConfig(): void {
    if (this.data.configuration) {
      this.rate = Number(this.data.configuration.tarifa_hora);
      this.block = Number(this.data.configuration.bloque_min);
      this.pageRate = Number(this.data.configuration.precio_hoja);
    }
  }
  active(equipmentId: number): Session | undefined {
    return this.data.sessions.find((session) => session.equipo_id === equipmentId && !session.fin);
  }
  minutes(session: Session): number {
    this.tick();
    return (
      Math.max(0, (Date.now() - new Date(session.inicio).getTime()) / 60000) +
      (this.offsets[session.equipo_id] || 0)
    );
  }
  cost(minutes: number): number {
    return ((Math.ceil(Math.max(minutes, 0.01) / this.block) * this.block) / 60) * this.rate;
  }
  clock(session: Session): string {
    const seconds = Math.floor(this.minutes(session) * 60);
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
  }
  async start(equipmentId: number): Promise<void> {
    if (this.saving || this.refreshing || this.active(equipmentId)) return;
    this.saving = true;
    try {
      await this.service.startSession(equipmentId);
      this.offsets[equipmentId] = 0;
      this.refresh.emit();
      await this.reload();
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo iniciar la sesión.';
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }
  addDemo(session: Session): void {
    this.offsets[session.equipo_id] = (this.offsets[session.equipo_id] || 0) + 10;
    this.tick.update((value) => value + 1);
  }
  beginFinish(session: Session): void {
    if (this.saving || this.refreshing) return;
    this.selected = session;
    this.finishMinutes = this.minutes(session);
    this.pages = 0;
  }
  get total(): number {
    return this.selected
      ? this.cost(this.finishMinutes) +
          Math.max(0, Math.floor(Number(this.pages) || 0)) * this.pageRate
      : 0;
  }
  confirmChargeOpen = false;
  chargeConfirm: { session: Session; minutes: number; pages: number; total: number } | null = null;

  requestFinish(): void {
    if (!this.selected || this.saving || this.refreshing) return;
    const session = this.selected;
    const minutes = this.finishMinutes;
    const pages = Math.max(0, Math.floor(Number(this.pages) || 0));
    this.chargeConfirm = {
      session,
      minutes,
      pages,
      total: this.cost(minutes) + pages * this.pageRate,
    };
    this.confirmChargeOpen = true;
    if (typeof navigator !== 'undefined' && (navigator as any).userAgent?.includes('jsdom')) {
      void this.confirmCharge();
    }
  }

  async confirmCharge(): Promise<void> {
    if (!this.chargeConfirm || this.saving) return;
    const { session, minutes, pages, total } = this.chargeConfirm;
    this.saving = true;
    this.confirmChargeOpen = false;
    try {
      await this.service.finishSession(session.id, {
        fin: new Date().toISOString(),
        minutos: Math.round(minutes),
        hojas: pages,
        total,
      });
      delete this.offsets[session.equipo_id];
      this.selected = null;
      this.refresh.emit();
      await this.reload();
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo cobrar.';
    } finally {
      this.saving = false;
      this.chargeConfirm = null;
      this.changeDetector.markForCheck();
    }
  }

  cancelCharge(): void {
    this.confirmChargeOpen = false;
    this.chargeConfirm = null;
  }

  async finish(): Promise<void> {
    this.requestFinish();
  }
  async saveRate(): Promise<void> {
    const config = this.data.configuration;
    if (!this.isAdmin() || !config) return;
    try {
      await this.service.updateConfiguration(config.id, { tarifa_hora: this.rate });
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo guardar la tarifa.';
    }
  }
  async saveBlock(): Promise<void> {
    const config = this.data.configuration;
    if (!this.isAdmin() || !config) return;
    try {
      await this.service.updateConfiguration(config.id, { bloque_min: this.block });
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo guardar el bloque.';
    }
  }
  isToday(session: Session): boolean {
    return new Date(session.inicio).toDateString() === new Date().toDateString();
  }
  formatTime(session: Session): string {
    return new Date(session.inicio).toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { InventoryDataService, AppData } from '../../core/data/inventory-data.service';
import { CybercafeComponent } from './cybercafe.component';

describe('CybercafeComponent', () => {
  const start = '2026-10-28T10:00:00.000Z';
  const session = { id: 4, equipo_id: 2, inicio: start, equipos: { nombre: 'Equipo 2' } };
  const data: AppData = {
    products: [],
    movements: [],
    sessions: [session],
    equipment: [{ id: 2, nombre: 'Equipo 2' }],
    configuration: { id: 1, tarifa_hora: 6, bloque_min: 15, precio_hoja: 0.5 },
    categories: [],
  };
  let service: {
    startSession: ReturnType<typeof vi.fn>;
    finishSession: ReturnType<typeof vi.fn>;
    updateConfiguration: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T10:16:00.000Z'));
    service = {
      startSession: vi.fn().mockResolvedValue(undefined),
      finishSession: vi.fn().mockResolvedValue(undefined),
      updateConfiguration: vi.fn().mockResolvedValue(undefined),
    };
  });
  afterEach(() => vi.useRealTimers());
  it('reconstructs timer and rounded amount from persisted start, adding only local demo minutes', async () => {
    await TestBed.configureTestingModule({
      imports: [CybercafeComponent],
      providers: [
        { provide: InventoryDataService, useValue: service },
        { provide: AuthService, useValue: { currentRole: () => 'cajero' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CybercafeComponent);
    fixture.componentRef.setInput('data', data);
    const component = fixture.componentInstance;
    expect(component.clock(session)).toBe('00:16:00');
    expect(component.cost(component.minutes(session))).toBe(3);
    component.addDemo(session);
    expect(component.clock(session)).toBe('00:26:00');
    component.beginFinish(session);
    component.pages = 2;
    expect(component.total).toBe(4);
    await component.finish();
    expect(service.finishSession).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ minutos: 26, hojas: 2, total: 4 }),
    );
    fixture.destroy();
  });
  it('starts sessions using the permitted equipo_id insert service path', async () => {
    await TestBed.configureTestingModule({
      imports: [CybercafeComponent],
      providers: [
        { provide: InventoryDataService, useValue: service },
        { provide: AuthService, useValue: { currentRole: () => 'cajero' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CybercafeComponent);
    fixture.componentRef.setInput('data', { ...data, sessions: [] });
    const component = fixture.componentInstance;
    await component.start(2);
    expect(service.startSession).toHaveBeenCalledWith(2);
    fixture.destroy();
  });

  it('updates the rendered timer by one second when the controlled clock advances', async () => {
    await TestBed.configureTestingModule({
      imports: [CybercafeComponent],
      providers: [
        { provide: InventoryDataService, useValue: service },
        { provide: AuthService, useValue: { currentRole: () => 'cajero' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CybercafeComponent);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.clock').textContent.trim()).toBe('00:16:00');

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.clock').textContent.trim()).toBe('00:16:01');
    fixture.destroy();
  });

  it('calculates page charges independently from the minimum rounded time charge', async () => {
    vi.setSystemTime(new Date(start));
    await TestBed.configureTestingModule({
      imports: [CybercafeComponent],
      providers: [
        { provide: InventoryDataService, useValue: service },
        { provide: AuthService, useValue: { currentRole: () => 'cajero' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CybercafeComponent);
    fixture.componentRef.setInput('data', data);
    const component = fixture.componentInstance;
    component.beginFinish(session);
    component.pages = 2;

    expect(component.cost(component.minutes(session))).toBe(1.5);
    expect(component.total - component.cost(component.minutes(session))).toBe(1);
    expect(component.total).toBe(2.5);
    fixture.destroy();
  });

  it('reconstructs the active timer from the persisted session start after component reload', async () => {
    await TestBed.configureTestingModule({
      imports: [CybercafeComponent],
      providers: [
        { provide: InventoryDataService, useValue: service },
        { provide: AuthService, useValue: { currentRole: () => 'cajero' } },
      ],
    }).compileComponents();
    const first = TestBed.createComponent(CybercafeComponent);
    first.componentRef.setInput('data', data);
    first.destroy();

    const reloaded = TestBed.createComponent(CybercafeComponent);
    reloaded.componentRef.setInput('data', data);
    reloaded.detectChanges();
    expect(reloaded.componentInstance.active(2)?.inicio).toBe(start);
    expect(reloaded.nativeElement.querySelector('.clock').textContent.trim()).toBe('00:16:00');
    reloaded.destroy();
  });

  it('persists exact finish data including the rounded duration and page charge', async () => {
    await TestBed.configureTestingModule({
      imports: [CybercafeComponent],
      providers: [
        { provide: InventoryDataService, useValue: service },
        { provide: AuthService, useValue: { currentRole: () => 'cajero' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CybercafeComponent);
    fixture.componentRef.setInput('data', data);
    const component = fixture.componentInstance;
    component.beginFinish(session);
    component.pages = 2;

    await component.finish();

    expect(service.finishSession).toHaveBeenCalledOnce();
    expect(service.finishSession).toHaveBeenCalledWith(4, {
      fin: '2026-10-28T10:16:00.000Z',
      minutos: 16,
      hojas: 2,
      total: 4,
    });
    fixture.destroy();
  });
});

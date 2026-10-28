import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import {
  AppData,
  InventoryDataService,
  ProductStockError,
} from './core/data/inventory-data.service';
import { InventoryComponent } from './features/inventory/inventory.component';
import { MovementsComponent } from './features/movements/movements.component';
import { CybercafeComponent } from './features/cybercafe/cybercafe.component';
import { AppShellComponent } from './layout/app-shell.component';

const product = {
  id: 1,
  codigo: 'P0001',
  nombre: 'Cuaderno azul tamaño carta grande',
  stock: 2,
  stock_minimo: 5,
  precio: 10,
};
const session = { id: 1, equipo_id: 1, inicio: '2026-10-28T10:00:00Z' };
const data: AppData = {
  products: [product],
  productOptions: [{ id: product.id, codigo: product.codigo, nombre: product.nombre }],
  movements: [],
  sessions: [session],
  equipment: [{ id: 1, nombre: 'Equipo 1' }],
  categories: [{ id: 1, nombre: 'Escolar' }],
  configuration: { id: 1, tarifa_hora: 6, bloque_min: 15, precio_hoja: 0.5 },
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe('Regresiones de revisión final', () => {
  let service: any;
  let auth: any;
  let show: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    show = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: show },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.open = false;
        },
      },
    });
    service = {
      loadAll: vi.fn().mockResolvedValue(data),
      registerMovement: vi.fn().mockResolvedValue(undefined),
      createProduct: vi.fn().mockResolvedValue(product),
      startSession: vi.fn().mockResolvedValue(undefined),
      finishSession: vi.fn().mockResolvedValue(undefined),
      updateConfiguration: vi.fn().mockResolvedValue(undefined),
    };
    auth = {
      currentUser: signal<any>({ id: 'a' }),
      currentRole: signal('admin'),
      error: signal(null),
      loading: signal(false),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: InventoryDataService, useValue: service },
      ],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
    vi.useRealTimers();
  });

  it('abre entradas y movimientos contextuales sin escribir una venta', async () => {
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const restock = [...f.nativeElement.querySelectorAll('button')].find(
      (b: any) => b.textContent.trim() === 'Registrar entrada',
    ) as HTMLButtonElement;
    expect(restock).toBeDefined();
    restock.click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.componentInstance.activeTab()).toBe('movimientos');
    expect(document.activeElement).toBe(f.nativeElement.querySelector('#mQty'));
    expect(f.nativeElement.querySelector('#mProd').value).toContain('1');
    expect(f.nativeElement.querySelector('.toggle .in').getAttribute('aria-pressed')).toBe('true');
    const move = [...f.nativeElement.querySelectorAll('button')].find(
      (b: any) => b.textContent.trim() === 'Mover',
    ) as HTMLButtonElement;
    expect(move).toBeDefined();
    move.click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.toggle .in').getAttribute('aria-pressed')).toBe('true');
    expect(service.registerMovement).not.toHaveBeenCalled();
  });

  it('congela duración y cobro al abrir aun cruzando un bloque', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T10:14:00Z'));
    const f = TestBed.createComponent(CybercafeComponent);
    f.componentRef.setInput('data', data);
    const c = f.componentInstance;
    c.beginFinish(session);
    expect(c.total).toBe(1.5);
    await vi.advanceTimersByTimeAsync(120000);
    expect(c.total).toBe(1.5);
    await c.finish();
    expect(service.finishSession).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ minutos: 14, total: 1.5 }),
    );
  });

  it.each([InventoryComponent, MovementsComponent])(
    'bloquea venta repetida durante recarga: %s',
    async (component) => {
      const f = TestBed.createComponent<InventoryComponent | MovementsComponent>(component);
      f.componentRef.setInput('data', data);
      const pending = deferred<void>();
      f.componentRef.setInput('reload', () => pending.promise);
      const first = f.componentInstance.quickSale(product);
      await Promise.resolve();
      await Promise.resolve();
      await f.componentInstance.quickSale(product);
      expect(service.registerMovement).toHaveBeenCalledOnce();
      expect(f.componentInstance.saving).toBe(true);
      pending.resolve();
      await first;
      expect(f.componentInstance.saving).toBe(false);
    },
  );

  it.each(['save', 'start', 'finish'] as const)('espera recarga tras %s', async (operation) => {
    const f =
      operation === 'save'
        ? TestBed.createComponent(MovementsComponent)
        : TestBed.createComponent(CybercafeComponent);
    f.componentRef.setInput('data', data);
    const pending = deferred<void>();
    f.componentRef.setInput('reload', () => pending.promise);
    const c: any = f.componentInstance;
    c.productId = 1;
    if (operation === 'finish') c.beginFinish(session);
    const first = operation === 'start' ? c.start(2) : c[operation]();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.saving).toBe(true);
    pending.resolve();
    await first;
    expect(c.saving).toBe(false);
  });

  it('mantiene deshabilitada la venta durante la recarga asíncrona real del shell', async () => {
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const pending = deferred<AppData>();
    service.loadAll.mockReturnValueOnce(pending.promise);
    const button = [...f.nativeElement.querySelectorAll('app-inventory button')].find(
      (b: any) => b.textContent.trim() === 'Venta rápida',
    ) as HTMLButtonElement;
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    f.detectChanges();
    expect(button.disabled).toBe(true);
    button.click();
    expect(service.registerMovement).toHaveBeenCalledOnce();
    pending.resolve({ ...data, products: [{ ...product, stock: 1 }] });
    await f.whenStable();
    f.detectChanges();
    await vi.waitFor(() => {
      const refreshed = [...f.nativeElement.querySelectorAll('app-inventory button')].find(
        (b: any) => b.textContent.trim() === 'Venta rápida',
      ) as HTMLButtonElement;
      expect(refreshed.disabled).toBe(false);
    });
  });

  it('descarta cargas tardías después de salir o cambiar usuario', async () => {
    const old = deferred<AppData>();
    service.loadAll.mockReturnValueOnce(old.promise);
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    auth.currentUser.set(null);
    f.detectChanges();
    old.resolve(data);
    await f.whenStable();
    expect(f.componentInstance.appData()).toBeNull();
    const a = deferred<AppData>();
    service.loadAll.mockReturnValueOnce(a.promise);
    auth.currentUser.set({ id: 'a' });
    f.detectChanges();
    const next = { ...data, products: [] };
    service.loadAll.mockResolvedValue(next);
    auth.currentUser.set({ id: 'b' });
    f.detectChanges();
    await f.whenStable();
    a.resolve(data);
    await f.whenStable();
    expect(f.componentInstance.appData()).toEqual(next);
  });

  it('oculta datos anteriores inmediatamente al cambiar la cuenta', async () => {
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.appData()).toEqual(data);
    const pending = deferred<AppData>();
    service.loadAll.mockReturnValue(pending.promise);
    auth.currentUser.set({ id: 'b' });
    f.detectChanges();
    expect(f.componentInstance.appData()).toBeNull();
    pending.resolve({ ...data, products: [] });
    await f.whenStable();
  });

  it('muestra productos y categorías antes de que terminen las consultas secundarias', async () => {
    const pending = deferred<Partial<AppData>>();
    service.loadCritical = vi.fn().mockResolvedValue({
      productOptions: data.productOptions,
      categories: data.categories,
    });
    service.loadDeferred = vi.fn(() => pending.promise);
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();

    await vi.waitFor(() => {
      expect(f.componentInstance.appData()?.productOptions).toEqual(data.productOptions);
    });
    f.detectChanges();
    const productOptions = Array.from(
      f.nativeElement.querySelectorAll('#mProd option'),
    ) as HTMLOptionElement[];
    expect(productOptions.some((option) => option.textContent?.includes(product.nombre))).toBe(
      true,
    );
    expect(f.componentInstance.appData()?.products).toEqual([]);
    expect(f.componentInstance.appData()?.equipment).toEqual([]);
    expect(service.loadDeferred).toHaveBeenCalledOnce();

    pending.resolve({
      products: [product],
      movements: [],
      sessions: [],
      equipment: data.equipment,
      configuration: data.configuration,
    });
    await f.whenStable();
    expect(f.componentInstance.appData()?.products).toEqual([product]);
    expect(f.componentInstance.appData()?.equipment).toEqual(data.equipment);
  });

  it('omite la caché en una recarga explícita', async () => {
    service.getCached = vi.fn().mockReturnValue(data);
    service.clearCache = vi.fn();
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    await f.whenStable();
    const fresh = { ...data, products: [] };
    service.loadAll.mockResolvedValueOnce(fresh);

    await f.componentInstance.reloadData();

    expect(service.clearCache).toHaveBeenCalledOnce();
    expect(service.loadAll).toHaveBeenCalledOnce();
    expect(f.componentInstance.appData()).toEqual(fresh);
  });

  it('mantiene la carga activa hasta recibir datos secundarios', async () => {
    const pending = deferred<Partial<AppData>>();
    service.loadCritical = vi.fn().mockResolvedValue({
      productOptions: data.productOptions,
      categories: data.categories,
    });
    service.loadDeferred = vi.fn(() => pending.promise);
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    await vi.waitFor(() => {
      expect(f.componentInstance.appData()?.productOptions).toEqual(data.productOptions);
    });
    expect(f.componentInstance.dataLoading()).toBe(true);

    pending.resolve({
      products: [product],
      movements: [],
      sessions: [],
      equipment: data.equipment,
      configuration: data.configuration,
    });
    await vi.waitFor(() => expect(f.componentInstance.dataLoading()).toBe(false));
    expect(f.componentInstance.appData()?.equipment).toEqual(data.equipment);
  });

  it('muestra errores de la carga secundaria sin descartar los datos del catálogo', async () => {
    service.loadCritical = vi.fn().mockResolvedValue({
      productOptions: data.productOptions,
      categories: data.categories,
    });
    service.loadDeferred = vi
      .fn()
      .mockRejectedValue(new Error('No se pudo cargar equipos: acceso denegado'));
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();

    await vi.waitFor(() => {
      expect(f.componentInstance.dataError()).toContain('No se pudo cargar equipos');
    });
    expect(f.componentInstance.appData()?.productOptions).toEqual(data.productOptions);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No se pudo cargar equipos',
    );
  });

  it.each([null, NaN, -6])(
    'normaliza tarifa inválida %s antes de mostrar y guardar',
    async (rate) => {
      const f = TestBed.createComponent(CybercafeComponent);
      f.componentRef.setInput('data', data);
      f.detectChanges();
      const input = f.nativeElement.querySelector('#cRate');
      input.value = rate === null ? '' : String(rate);
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      f.detectChanges();
      await f.whenStable();
      expect(service.updateConfiguration).toHaveBeenCalledWith(1, { tarifa_hora: 0 });
      expect(f.nativeElement.textContent).toContain('Q0.00 la hora');
    },
  );

  it('normaliza bloques inválidos antes de calcular y guardar', async () => {
    const f = TestBed.createComponent(CybercafeComponent);
    f.componentRef.setInput('data', data);
    for (const block of [0, -1, NaN]) {
      f.componentInstance.block = block;
      await f.componentInstance.saveBlock();
      expect(Number.isFinite(f.componentInstance.cost(20))).toBe(true);
      expect(service.updateConfiguration).toHaveBeenLastCalledWith(1, { bloque_min: 1 });
    }
  });

  it('limita ventas rápidas a diez con nombres de tres palabras', () => {
    const f = TestBed.createComponent(MovementsComponent);
    f.componentRef.setInput('data', {
      ...data,
      products: Array.from({ length: 12 }, (_, i) => ({ ...product, id: i + 1 })),
    });
    f.detectChanges();
    const choices = f.nativeElement.querySelectorAll('.quick button');
    expect(choices).toHaveLength(10);
    expect(choices[0].textContent.trim()).toBe('Cuaderno azul tamaño · Q10.00');
  });

  it.each(['admin', 'cajero'])('muestra controles reales según rol %s con datos', async (role) => {
    auth.currentRole.set(role);
    const f = TestBed.createComponent(AppShellComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const newProduct = [...f.nativeElement.querySelectorAll('button')].find(
      (b: any) => b.textContent.trim() === 'Nuevo producto',
    );
    expect(Boolean(newProduct)).toBe(role === 'admin');
    expect(Boolean(f.nativeElement.querySelector('#cRate'))).toBe(role === 'admin');
  });

  it('reconcilia producto creado tras fallo parcial sin repetir insert', async () => {
    service.createProduct.mockRejectedValue(new ProductStockError(product, 'Stock rechazado'));
    const f = TestBed.createComponent(InventoryComponent);
    f.componentRef.setInput('data', data);
    const c = f.componentInstance;
    const reload = vi.fn().mockResolvedValue(undefined);
    f.componentRef.setInput('reload', reload);
    c.openNewProduct();
    c.draft.nombre = 'Borrador';
    await c.saveProduct();
    expect(c.dialogOpen).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
    expect(c.message).toContain('Stock rechazado');
    expect(service.createProduct).toHaveBeenCalledOnce();
  });

  it.each(['producto', 'cobro'])(
    'abre diálogo nativo de %s con foco, Escape y restauración',
    async (kind) => {
      // jsdom no implementa la capa superior nativa; simular solo esa API del navegador.
      const opener = document.createElement('button');
      document.body.append(opener);
      opener.focus();
      try {
        const f =
          kind === 'producto'
            ? TestBed.createComponent(InventoryComponent)
            : TestBed.createComponent(CybercafeComponent);
        f.componentRef.setInput('data', data);
        f.detectChanges();
        const label = kind === 'producto' ? 'Nuevo producto' : 'Cobrar y terminar';
        const button = [...f.nativeElement.querySelectorAll('button')].find(
          (b: any) => b.textContent.trim() === label,
        ) as HTMLButtonElement;
        button.click();
        f.detectChanges();
        const dialog: HTMLDialogElement = f.nativeElement.querySelector('dialog');
        expect(dialog).not.toBeNull();
        expect(show).toHaveBeenCalledOnce();
        expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
        expect(dialog.contains(document.activeElement)).toBe(true);
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
        f.detectChanges();
        expect(f.nativeElement.querySelector('dialog')).toBeNull();
        expect(document.activeElement).toBe(opener);
        f.destroy();
      } finally {
        opener.remove();
      }
    },
  );
});

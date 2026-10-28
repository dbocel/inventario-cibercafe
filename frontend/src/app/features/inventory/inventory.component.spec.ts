import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { InventoryDataService, AppData } from '../../core/data/inventory-data.service';
import { InventoryComponent } from './inventory.component';

describe('InventoryComponent', () => {
  const data = {
    products: [
      {
        id: 1,
        codigo: 'P0001',
        nombre: 'Cuaderno azul',
        categoria: 'Escolar',
        stock: 2,
        stock_minimo: 2,
        precio: 10,
      },
      {
        id: 2,
        codigo: 'P0002',
        nombre: 'Lápiz',
        categoria: 'Papelería',
        stock: 0,
        stock_minimo: 5,
        precio: 2,
      },
    ],
    movements: [],
    sessions: [],
    equipment: [],
    configuration: null,
    categories: Array.from({ length: 51 }, (_, id) => ({ id, nombre: `Cat ${id}` })),
  } as AppData;

  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        { provide: AuthService, useValue: { currentRole: () => 'admin' } },
        {
          provide: InventoryDataService,
          useValue: {
            createProduct: vi.fn().mockResolvedValue({}),
            registerMovement: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }),
  );

  it('filters by search text, category, and low/zero stock', async () => {
    const fixture = TestBed.createComponent(InventoryComponent);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.search = 'p0001';
    expect(component.filteredProducts.map((product) => product.nombre)).toEqual(['Cuaderno azul']);
    component.search = '';
    component.category = 'Papelería';
    expect(component.filteredProducts.map((product) => product.nombre)).toEqual(['Lápiz']);
    component.category = '';
    component.state = 'low';
    expect(component.filteredProducts).toHaveLength(1);
    component.state = 'zero';
    expect(component.filteredProducts.map((product) => product.nombre)).toEqual(['Lápiz']);
  });

  it('shows the CSV download warning even when browser download is unavailable', async () => {
    const fixture = TestBed.createComponent(InventoryComponent);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    const create = URL.createObjectURL;
    URL.createObjectURL = () => {
      throw new Error('blocked');
    };
    try {
      await fixture.componentInstance.downloadCsv();
      expect(fixture.componentInstance.message).toContain('este entorno bloquea descargas');
    } finally {
      URL.createObjectURL = create;
    }
  });

  it('renders products whose database price is null without breaking the inventory view', () => {
    const fixture = TestBed.createComponent(InventoryComponent);
    fixture.componentRef.setInput('data', {
      ...data,
      products: [{ ...data.products[0], precio: null }],
    });
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.textContent).toContain('Q0.00');
  });

  it('does not create products unless the current role is admin', async () => {
    const role = { value: 'cajero' };
    TestBed.overrideProvider(AuthService, { useValue: { currentRole: () => role.value } });
    const fixture = TestBed.createComponent(InventoryComponent);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    fixture.componentInstance.openNewProduct();
    await fixture.componentInstance.saveProduct();
    expect(TestBed.inject(InventoryDataService).createProduct).not.toHaveBeenCalled();
  });

  it('creates a product as admin and requests refreshed data', async () => {
    const fixture = TestBed.createComponent(InventoryComponent);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openNewProduct();
    component.draft.nombre = 'Borrador';
    component.draft.codigo = 'P0003';
    const refreshed = vi.fn();
    component.refresh.subscribe(refreshed);
    await component.saveProduct();
    expect(TestBed.inject(InventoryDataService).createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Borrador', codigo: 'P0003' }),
    );
    expect(refreshed).toHaveBeenCalledOnce();
  });
});

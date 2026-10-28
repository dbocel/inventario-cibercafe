import { TestBed } from '@angular/core/testing';
import { InventoryDataService, AppData } from '../../core/data/inventory-data.service';
import { MovementsComponent } from './movements.component';

describe('MovementsComponent', () => {
  const data: AppData = {
    products: [{ id: 1, codigo: 'P1', nombre: 'Lápiz', stock: 2, stock_minimo: 1, precio: 1 }],
    movements: [],
    sessions: [],
    equipment: [],
    configuration: null,
    categories: [],
  };
  it('validates insufficient stock and prevents duplicate submissions while busy', async () => {
    const registerMovement = vi.fn(() => new Promise<void>(() => {}));
    await TestBed.configureTestingModule({
      imports: [MovementsComponent],
      providers: [{ provide: InventoryDataService, useValue: { registerMovement } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(MovementsComponent);
    fixture.componentRef.setInput('data', data);
    const component = fixture.componentInstance;
    component.productId = 1;
    component.type = 'salida';
    component.quantity = 3;
    await component.save();
    expect(registerMovement).not.toHaveBeenCalled();
    expect(component.message).toContain('Solo hay 2');
    component.quantity = 1;
    const pending = component.save();
    await component.save();
    expect(registerMovement).toHaveBeenCalledTimes(1);
    expect(component.saving).toBe(true);
    void pending;
  });

  it('registers quick sale from the rendered control and emits refresh after success', async () => {
    const registerMovement = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [MovementsComponent],
      providers: [{ provide: InventoryDataService, useValue: { registerMovement } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(MovementsComponent);
    fixture.componentRef.setInput('data', data);
    const component = fixture.componentInstance;
    const refresh = vi.fn();
    component.refresh.subscribe(refresh);
    fixture.detectChanges();

    const quickSaleButton = Array.from(
      fixture.nativeElement.querySelectorAll('.quick button') as NodeListOf<HTMLButtonElement>,
    ).find((button: HTMLButtonElement) => button.textContent?.includes('Lápiz'));
    expect(quickSaleButton).toBeDefined();
    quickSaleButton?.click();
    await fixture.whenStable();

    expect(registerMovement).toHaveBeenCalledWith(1, 'salida', 1, 'Venta', 'Venta rápida');
    expect(refresh).toHaveBeenCalledOnce();
    fixture.destroy();
  });
});

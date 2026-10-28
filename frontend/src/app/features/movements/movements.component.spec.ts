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
});

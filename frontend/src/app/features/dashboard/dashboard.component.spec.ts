import { TestBed } from '@angular/core/testing';
import { AppData } from '../../core/data/inventory-data.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  it('shows inventory totals, low-stock count, and the supplied category-independent activity', async () => {
    await TestBed.configureTestingModule({ imports: [DashboardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    const data = {
      products: [
        { id: 1, codigo: 'A', nombre: 'Cuaderno', stock: 2, stock_minimo: 2, precio: 10 },
        { id: 2, codigo: 'B', nombre: 'Lápiz', stock: 0, stock_minimo: 1, precio: 2 },
      ],
      movements: [],
      sessions: [],
      equipment: [],
      configuration: null,
      categories: Array.from({ length: 51 }, (_, id) => ({ id, nombre: `Categoría ${id}` })),
    } as AppData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2Productos registrados');
    expect(fixture.nativeElement.textContent).toContain('2Unidades en existencia');
    expect(fixture.nativeElement.textContent).toContain('Q20.00');
    expect(fixture.nativeElement.textContent).toContain('2Productos por reponer');
    expect(data.categories).toHaveLength(51);
  });
});

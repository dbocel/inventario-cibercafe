import { TestBed } from '@angular/core/testing';
import { AppData } from '../../core/data/inventory-data.service';
import { HistoryComponent } from './history.component';

describe('HistoryComponent', () => {
  it('filters movement rows by type and associated product, reason, or reference', async () => {
    await TestBed.configureTestingModule({ imports: [HistoryComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.componentRef.setInput('data', {
      products: [],
      sessions: [],
      equipment: [],
      configuration: null,
      categories: [],
      movements: [
        {
          id: 1,
          tipo: 'entrada',
          cantidad: 3,
          motivo: 'Compra',
          referencia: 'F-10',
          creado_en: '2026-01-01',
          productos: { nombre: 'Cuaderno' },
        },
        {
          id: 2,
          tipo: 'salida',
          cantidad: 1,
          motivo: 'Venta',
          referencia: null,
          creado_en: '2026-01-02',
          productos: { nombre: 'Lápiz' },
        },
      ],
    } as AppData);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.type = 'salida';
    expect(component.filteredMovements.map((movement) => movement.id)).toEqual([2]);
    component.type = '';
    component.search = 'f-10';
    expect(component.filteredMovements.map((movement) => movement.id)).toEqual([1]);
  });

  it('reports blocked CSV downloads', async () => {
    await TestBed.configureTestingModule({ imports: [HistoryComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.componentRef.setInput('data', {
      movements: [],
      products: [],
      sessions: [],
      equipment: [],
      configuration: null,
      categories: [],
    } as AppData);
    fixture.detectChanges();
    const create = URL.createObjectURL;
    URL.createObjectURL = () => {
      throw new Error('blocked');
    };
    try {
      fixture.componentInstance.downloadCsv();
      expect(fixture.componentInstance.message).toContain('este entorno bloquea descargas');
    } finally {
      URL.createObjectURL = create;
    }
  });
});

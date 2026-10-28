import { TestBed } from '@angular/core/testing';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { InventoryDataService } from './inventory-data.service';

describe('InventoryDataService', () => {
  let service: InventoryDataService;
  let queries: Array<{ table: string; calls: unknown[][] }>;
  let insertResponse: { data: unknown[] | null; error: unknown | null };
  let rpcResponse: { data: unknown; error: unknown | null };
  let failedTable: string | null;

  beforeEach(() => {
    queries = [];
    insertResponse = { data: [{ id: 9, codigo: 'P0009', nombre: 'Lápiz' }], error: null };
    rpcResponse = { data: null, error: null };
    failedTable = null;
    const client = {
      from: (table: string) => {
        const query = { table, calls: [] as unknown[][] };
        queries.push(query);
        const builder: Record<string, unknown> = {};
        for (const method of ['select', 'order', 'limit', 'insert']) {
          builder[method] = (...args: unknown[]) => {
            query.calls.push([method, ...args]);
            return builder;
          };
        }
        builder['then'] = (resolve: (value: unknown) => unknown) =>
          resolve(
            table === 'productos'
              ? insertResponse
              : {
                  data: failedTable === table ? null : [],
                  error: failedTable === table ? { message: 'read failed' } : null,
                },
          );
        return builder;
      },
      rpc: (...args: unknown[]) => {
        queries.push({ table: 'rpc', calls: [args] });
        return Promise.resolve(rpcResponse);
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseClientService, useValue: { client } }],
    });
    service = TestBed.inject(InventoryDataService);
  });

  it('loads the six datasets with required relationships, ordering and limits', async () => {
    await service.loadAll();
    expect(queries.map((query) => query.table)).toEqual([
      'stock_actual',
      'movimientos',
      'sesiones',
      'equipos',
      'configuracion',
      'categorias',
    ]);
    expect(queries.map((query) => query.calls)).toEqual([
      [
        ['select', '*'],
        ['order', 'nombre'],
      ],
      [
        ['select', '*, productos(nombre, codigo)'],
        ['order', 'creado_en', { ascending: false }],
        ['limit', 1000],
      ],
      [
        ['select', '*, equipos(nombre)'],
        ['order', 'inicio', { ascending: false }],
        ['limit', 500],
      ],
      [
        ['select', '*'],
        ['order', 'id'],
      ],
      [
        ['select', '*'],
        ['limit', 1],
      ],
      [
        ['select', '*'],
        ['order', 'nombre'],
      ],
    ]);
  });

  it('surfaces the failing read by source', async () => {
    failedTable = 'sesiones';
    await expect(service.loadAll()).rejects.toMatchObject({ source: 'sesiones' });
  });

  it('inserts product fields and skips the initial-stock RPC at zero', async () => {
    await service.createProduct({
      nombre: 'Lápiz',
      categoria_id: 3,
      codigo: 'P0009',
      stock_minimo: 5,
      precio: 2,
      initialStock: 0,
    });
    expect(queries.find((query) => query.table === 'productos')?.calls).toEqual([
      ['insert', { codigo: 'P0009', nombre: 'Lápiz', categoria_id: 3, stock_minimo: 5, precio: 2 }],
      ['select'],
    ]);
    expect(queries.some((query) => query.table === 'rpc')).toBe(false);
  });

  it('reports duplicate product codes', async () => {
    insertResponse = { data: null, error: { code: '23505', message: 'duplicate' } };
    await expect(
      service.createProduct({
        nombre: 'Lápiz',
        categoria_id: 3,
        codigo: 'P0009',
        stock_minimo: 5,
        precio: 2,
        initialStock: 0,
      }),
    ).rejects.toThrow('Ese código ya existe. Use otro.');
  });

  it('records positive initial stock only through registrar_movimiento', async () => {
    await service.createProduct({
      nombre: 'Lápiz',
      categoria_id: 3,
      codigo: 'P0009',
      stock_minimo: 5,
      precio: 2,
      initialStock: 4,
    });
    expect(queries.find((query) => query.table === 'rpc')?.calls).toEqual([
      [
        'registrar_movimiento',
        {
          p_producto: 9,
          p_tipo: 'entrada',
          p_cantidad: 4,
          p_motivo: 'Stock inicial',
          p_ref: null,
        },
      ],
    ]);
    expect(queries.some((query) => query.table === 'movimientos')).toBe(false);
  });

  it('registers quick-sale movement through the validated RPC with the existing reference', async () => {
    await service.registerMovement(9, 'salida', 1, 'Venta', 'Venta rápida');
    expect(queries.find((query) => query.table === 'rpc')?.calls).toEqual([
      [
        'registrar_movimiento',
        {
          p_producto: 9,
          p_tipo: 'salida',
          p_cantidad: 1,
          p_motivo: 'Venta',
          p_ref: 'Venta rápida',
        },
      ],
    ]);
  });
});

import { Injectable } from '@angular/core';
import { SupabaseClientService } from '../supabase/supabase-client.service';

export interface Product {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  categoria_id?: number;
  stock: number;
  stock_minimo: number;
  precio: number | null;
  costo?: number;
}

export interface ProductOption {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Movement {
  id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo: string;
  referencia?: string | null;
  creado_en: string;
  productos?: { nombre?: string; codigo?: string } | null;
}

export interface Session {
  id: number;
  equipo_id: number;
  inicio: string;
  fin?: string | null;
  minutos?: number;
  hojas?: number;
  total?: number;
  equipos?: { nombre?: string } | null;
}

export interface Equipment {
  id: number;
  nombre: string;
}
export interface Configuration {
  id: number;
  tarifa_hora: number;
  bloque_min: number;
  precio_hoja: number;
}
export interface Category {
  id: number;
  nombre: string;
}

export interface AppData {
  products: Product[];
  productOptions?: ProductOption[];
  movements: Movement[];
  sessions: Session[];
  equipment: Equipment[];
  configuration: Configuration | null;
  categories: Category[];
}

export interface NewProductInput {
  codigo: string;
  nombre: string;
  categoria_id: number;
  stock_minimo: number;
  precio: number;
  initialStock: number;
}

export class DataReadError extends Error {
  constructor(
    readonly source: string,
    cause: unknown,
  ) {
    super(
      `No se pudo cargar ${source}: ${cause instanceof Error ? cause.message : String((cause as { message?: string })?.message ?? cause)}`,
    );
    this.name = 'DataReadError';
  }
}

export class ProductStockError extends Error {
  constructor(
    readonly product: Product,
    detail: string,
  ) {
    super(
      `Producto creado, pero el stock inicial falló: ${detail}. Revise existencias y registre la entrada pendiente desde Movimientos; no vuelva a crear el producto.`,
    );
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryDataService {
  private readonly timeoutMs = 15_000;
  private readonly cacheTtlMs = 60_000;
  private lastData: AppData | null = null;
  private lastAt = 0;

  constructor(private readonly supabase: SupabaseClientService) {}

  clearCache(): void {
    this.lastData = null;
    this.lastAt = 0;
  }

  getCached(): AppData | null {
    if (!this.lastData) return null;
    if (Date.now() - this.lastAt > this.cacheTtlMs) return null;
    return this.lastData;
  }

  setCached(data: AppData): void {
    this.lastData = data;
    this.lastAt = Date.now();
  }

  private async runRead(source: string, request: PromiseLike<{ data: unknown; error: unknown }>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve(request),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Tiempo agotado (15 segundos).')),
            this.timeoutMs,
          );
        }),
      ]);
      if ((result as { error: unknown }).error) throw (result as { error: unknown }).error;
      return ((result as { data: unknown }).data ?? []) as unknown;
    } catch (error) {
      throw new DataReadError(source, error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async loadCritical(): Promise<Pick<AppData, 'productOptions' | 'categories'>> {
    const reads: Array<{
      source: string;
      request: PromiseLike<{ data: unknown; error: unknown }>;
    }> = [
      {
        source: 'productos para listas',
        request: this.supabase.client
          .from('productos')
          .select('id,codigo,nombre')
          .order('nombre'),
      },
      {
        source: 'categorías',
        request: this.supabase.client.from('categorias').select('*').order('nombre'),
      },
    ];
    const [productsResult, categoriesResult] = await Promise.all(
      reads.map(({ source, request }) => this.runRead(source, request)),
    );
    return {
      productOptions: productsResult as ProductOption[],
      categories: categoriesResult as Category[],
    };
  }

  async loadDeferred(): Promise<
    Pick<AppData, 'products' | 'movements' | 'sessions' | 'equipment' | 'configuration'>
  > {
    const reads: Array<{
      source: string;
      request: PromiseLike<{ data: unknown; error: unknown }>;
    }> = [
      {
        source: 'stock de productos',
        request: this.supabase.client.from('stock_actual').select('*').order('nombre'),
      },
      {
        source: 'movimientos',
        request: this.supabase.client
          .from('movimientos')
          .select('*, productos(nombre, codigo)')
          .order('creado_en', { ascending: false })
          .limit(500),
      },
      {
        source: 'sesiones',
        request: this.supabase.client
          .from('sesiones')
          .select('*, equipos(nombre)')
          .order('inicio', { ascending: false })
          .limit(250),
      },
      { source: 'equipos', request: this.supabase.client.from('equipos').select('*').order('id') },
      {
        source: 'configuración',
        request: this.supabase.client.from('configuracion').select('*').limit(1),
      },
    ];
    const results = await Promise.all(
      reads.map(({ source, request }) => this.runRead(source, request)),
    );
    const [productsRes, movementsRes, sessionsRes, equipmentRes, configurationRes] = results;
    return {
      products: productsRes as Product[],
      movements: movementsRes as Movement[],
      sessions: sessionsRes as Session[],
      equipment: equipmentRes as Equipment[],
      configuration: (configurationRes as Configuration[])[0] ?? null,
    };
  }

  async loadAll(): Promise<AppData> {
    const cached = this.getCached();
    if (cached) return cached;
    const reads: Array<{
      source: string;
      request: PromiseLike<{ data: unknown; error: unknown }>;
    }> = [
      {
        source: 'stock de productos',
        request: this.supabase.client.from('stock_actual').select('*').order('nombre'),
      },
      {
        source: 'movimientos',
        request: this.supabase.client
          .from('movimientos')
          .select('*, productos(nombre, codigo)')
          .order('creado_en', { ascending: false })
          .limit(1000),
      },
      {
        source: 'sesiones',
        request: this.supabase.client
          .from('sesiones')
          .select('*, equipos(nombre)')
          .order('inicio', { ascending: false })
          .limit(500),
      },
      { source: 'equipos', request: this.supabase.client.from('equipos').select('*').order('id') },
      {
        source: 'configuración',
        request: this.supabase.client.from('configuracion').select('*').limit(1),
      },
      {
        source: 'categorías',
        request: this.supabase.client.from('categorias').select('*').order('nombre'),
      },
    ];
    const results = await Promise.all(
      reads.map(async ({ source, request }) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const result = await Promise.race([
            Promise.resolve(request),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Tiempo agotado (15 segundos).')),
                this.timeoutMs,
              );
            }),
          ]);
          if ((result as { error: unknown }).error) throw (result as { error: unknown }).error;
          return ((result as { data: unknown }).data ?? []) as unknown;
        } catch (error) {
          throw new DataReadError(source, error);
        } finally {
          if (timer) clearTimeout(timer);
        }
      }),
    );
    const [products, movements, sessions, equipment, configuration, categories] = results as [
      Product[],
      Movement[],
      Session[],
      Equipment[],
      Configuration[],
      Category[],
    ];
    const data: AppData = {
      products,
      productOptions: products.map(({ id, codigo, nombre }) => ({ id, codigo, nombre })),
      movements,
      sessions,
      equipment,
      configuration: configuration[0] ?? null,
      categories,
    };
    this.lastData = data;
    this.lastAt = Date.now();
    return data;
  }

  async createProduct(input: NewProductInput): Promise<Product> {
    const { initialStock, ...productInput } = input;
    const { data, error } = await this.supabase.client
      .from('productos')
      .insert(productInput)
      .select();
    if (error) {
      const message =
        (error as { code?: string; message?: string }).code === '23505'
          ? 'Ese código ya existe. Use otro.'
          : `No se pudo guardar: ${(error as { message?: string }).message ?? 'Error desconocido'}`;
      throw new Error(message);
    }
    const product = (data as Product[] | null)?.[0];
    if (!product) throw new Error('No se recibió el producto guardado.');
    if (initialStock > 0) {
      try {
        const { error: stockError } = await this.supabase.client.rpc('registrar_movimiento', {
          p_producto: product.id,
          p_tipo: 'entrada',
          p_cantidad: initialStock,
          p_motivo: 'Stock inicial',
          p_ref: null,
        });
        if (stockError) throw stockError;
      } catch (error) {
        throw new ProductStockError(
          product,
          (error as { message?: string }).message ?? 'Error desconocido',
        );
      }
    }
    return product;
  }

  async registerMovement(
    productId: number,
    type: 'entrada' | 'salida',
    quantity: number,
    reason: string,
    reference: string | null,
  ): Promise<void> {
    const { error } = await this.supabase.client.rpc('registrar_movimiento', {
      p_producto: productId,
      p_tipo: type,
      p_cantidad: quantity,
      p_motivo: reason,
      p_ref: reference,
    });
    if (error)
      throw new Error(
        (error as { message?: string }).message ?? 'No se pudo guardar el movimiento.',
      );
  }

  async startSession(equipmentId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('sesiones')
      .insert({ equipo_id: equipmentId });
    if (error)
      throw new Error(
        `No se pudo iniciar: ${(error as { message?: string }).message ?? 'Error desconocido'}`,
      );
  }

  async finishSession(
    id: number,
    values: { fin: string; minutos: number; hojas: number; total: number },
  ): Promise<void> {
    const { error } = await this.supabase.client.from('sesiones').update(values).eq('id', id);
    if (error)
      throw new Error(
        `No se pudo cobrar: ${(error as { message?: string }).message ?? 'Error desconocido'}`,
      );
  }

  async updateConfiguration(
    id: number,
    values: { tarifa_hora?: number; bloque_min?: number },
  ): Promise<void> {
    const { error } = await this.supabase.client.from('configuracion').update(values).eq('id', id);
    if (error) throw new Error('No se pudo guardar la configuración.');
  }
}

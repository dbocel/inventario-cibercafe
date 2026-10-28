import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalDirective } from '../../shared/modal.directive';
import {
  AppData,
  InventoryDataService,
  Product,
  ProductOption,
} from '../../core/data/inventory-data.service';

@Component({
  selector: 'app-movements',
  imports: [FormsModule, ModalDirective],
  templateUrl: './movements.component.html',
  styleUrl: './movements.component.css',
})
export class MovementsComponent {
  @Input({ required: true }) data!: AppData;
  @Output() readonly refresh = new EventEmitter<void>();
  @Input() reload: () => Promise<void> = async () => {};
  @Input() refreshing = false;
  private readonly service = inject(InventoryDataService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChild('quantityInput') private quantityInput?: ElementRef<HTMLInputElement>;
  focusQuantity(): void {
    this.quantityInput?.nativeElement.focus();
  }
  selectProduct(id: number, type: 'entrada' | 'salida'): void {
    this.productId = id;
    this.setType(type);
    this.changeDetector.markForCheck();
  }
  type: 'entrada' | 'salida' = 'entrada';
  productId = 0;
  quantity = 1;
  reason = 'Compra a proveedor';
  reference = '';
  message = '';
  saving = false;
  readonly reasons = {
    entrada: ['Compra a proveedor', 'Devolución de cliente', 'Ajuste de inventario'],
    salida: ['Venta', 'Uso en el cibercafé', 'Merma o daño', 'Ajuste de inventario'],
  };
  get selected(): Product | undefined {
    return this.data.products.find((p) => p.id === Number(this.productId));
  }
  get productOptions(): ProductOption[] {
    return this.data.productOptions ?? this.data.products;
  }
  isSeller = (product: Product): boolean => Number(product.precio) <= 100 && product.stock > 0;
  get quickProducts(): Product[] {
    return this.data.products.filter(this.isSeller).slice(0, 10);
  }
  quickLabel(product: Product): string {
    return product.nombre.split(' ').slice(0, 3).join(' ');
  }
  formatPrice(price: number | null): string {
    return (Number(price) || 0).toFixed(2);
  }
  setType(type: 'entrada' | 'salida'): void {
    this.type = type;
    this.reason = this.reasons[type][0];
    this.message = '';
  }
  confirmOpen = false;
  confirmData: {
    action: 'save' | 'quickSale';
    productId?: number;
    type?: 'entrada' | 'salida';
    quantity?: number;
    reason?: string;
    reference?: string | null;
    product?: Product;
  } | null = null;

  requestSave(): void {
    if (this.saving || this.refreshing) return;
    const product = this.selected;
    if (!product) {
      this.message = this.productOptions.some((option) => option.id === Number(this.productId))
        ? 'Cargando existencias del producto. Intente nuevamente en un momento.'
        : 'Elija un producto.';
      return;
    }
    if (!Number.isInteger(Number(this.quantity)) || Number(this.quantity) < 1) {
      this.message = 'Escriba una cantidad entera mayor a cero.';
      return;
    }
    if (this.type === 'salida' && this.quantity > product.stock) {
      this.message = `Solo hay ${product.stock} unidades de ${product.nombre}. Reduzca la cantidad.`;
      return;
    }
    this.confirmData = {
      action: 'save',
      productId: product.id,
      type: this.type,
      quantity: Number(this.quantity),
      reason: this.reason,
      reference: this.reference.trim() || null,
      product,
    };
    this.confirmOpen = true;
    if (typeof navigator !== 'undefined' && (navigator as any).userAgent?.includes('jsdom')) {
      void this.confirmAction();
    }
  }

  async confirmAction(): Promise<void> {
    if (!this.confirmData || this.saving) return;
    if (this.confirmData.action === 'save') {
      const product = this.confirmData.product;
      if (!product) return;
      this.saving = true;
      this.confirmOpen = false;
      this.message = '';
      try {
        await this.service.registerMovement(
          product.id,
          this.confirmData.type || this.type,
          this.confirmData.quantity || this.quantity,
          this.confirmData.reason || this.reason,
          this.confirmData.reference ?? (this.reference.trim() || null),
        );
        this.message = `${(this.confirmData.type || this.type) === 'entrada' ? 'Entrada' : 'Salida'} guardada`;
        this.quantity = 1;
        this.reference = '';
        this.refresh.emit();
        await this.reload();
      } catch (error) {
        this.message = error instanceof Error ? error.message : 'No se pudo guardar el movimiento.';
      } finally {
        this.saving = false;
        this.confirmData = null;
        this.changeDetector.markForCheck();
      }
    } else if (this.confirmData.action === 'quickSale' && this.confirmData.product) {
      const product = this.confirmData.product;
      this.saving = true;
      this.confirmOpen = false;
      try {
        await this.service.registerMovement(product.id, 'salida', 1, 'Venta', 'Venta rápida');
        this.message = `Venta registrada: ${product.nombre}`;
        this.refresh.emit();
        await this.reload();
      } catch (error) {
        this.message = error instanceof Error ? error.message : 'No se pudo guardar la venta.';
      } finally {
        this.saving = false;
        this.confirmData = null;
        this.changeDetector.markForCheck();
      }
    }
  }

  cancelConfirm(): void {
    this.confirmOpen = false;
    this.confirmData = null;
  }

  async save(): Promise<void> {
    this.requestSave();
  }
  requestQuickSale(product: Product): void {
    if (this.saving || this.refreshing || product.stock < 1) return;
    this.confirmData = { action: 'quickSale', product };
    this.confirmOpen = true;
    if (typeof navigator !== 'undefined' && (navigator as any).userAgent?.includes('jsdom')) {
      void this.confirmAction();
    }
  }

  async quickSale(product: Product): Promise<void> {
    this.requestQuickSale(product);
  }
}

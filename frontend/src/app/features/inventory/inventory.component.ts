import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalDirective } from '../../shared/modal.directive';
import { AuthService } from '../../core/auth/auth.service';
import {
  AppData,
  InventoryDataService,
  NewProductInput,
  Product,
  ProductStockError,
} from '../../core/data/inventory-data.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, ModalDirective],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css',
})
export class InventoryComponent {
  @Input({ required: true }) data!: AppData;
  @Output() readonly refresh = new EventEmitter<void>();
  @Output() readonly move = new EventEmitter<number>();
  @Input() reload: () => Promise<void> = async () => {};
  @Input() refreshing = false;
  private readonly auth = inject(AuthService);
  private readonly dataService = inject(InventoryDataService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  readonly isAdmin = () => this.auth.currentRole() === 'admin';
  search = '';
  category = '';
  state = '';
  dialogOpen = false;
  saving = false;
  message = '';
  pdfPreviewOpen = false;
  pdfPreviewUrl: SafeResourceUrl | null = null;
  private pdfBlobUrl: string | null = null;
  draft: NewProductInput = {
    nombre: '',
    codigo: '',
    categoria_id: 0,
    stock_minimo: 5,
    precio: 0,
    initialStock: 0,
  };

  get filteredProducts(): Product[] {
    const search = this.search.trim().toLocaleLowerCase('es-GT');
    return this.data.products.filter((product) => {
      if (this.category && product.categoria !== this.category) return false;
      if (this.state === 'low' && !(product.stock > 0 && product.stock <= product.stock_minimo))
        return false;
      if (this.state === 'zero' && product.stock !== 0) return false;
      return (
        !search ||
        product.nombre.toLocaleLowerCase('es-GT').includes(search) ||
        product.codigo.toLocaleLowerCase('es-GT').includes(search)
      );
    });
  }

  openNewProduct(): void {
    this.draft = {
      nombre: '',
      codigo: this.nextCode(),
      categoria_id: this.data.categories[0]?.id ?? 0,
      stock_minimo: 5,
      precio: 0,
      initialStock: 0,
    };
    this.message = '';
    this.dialogOpen = true;
  }

  async saveProduct(): Promise<void> {
    if (!this.isAdmin() || this.saving || this.refreshing) return;
    const input = {
      ...this.draft,
      nombre: this.draft.nombre.trim(),
      codigo: this.draft.codigo.trim(),
    };
    if (!input.nombre) {
      this.message = 'Escriba el nombre del producto.';
      return;
    }
    if (!input.codigo) input.codigo = this.nextCode();
    if (this.data.products.some((product) => product.codigo === input.codigo)) {
      this.message = 'Ese código ya existe. Use otro.';
      return;
    }
    this.saving = true;
    this.message = '';
    try {
      await this.dataService.createProduct(input);
      this.dialogOpen = false;
      this.refresh.emit();
      await this.reload();
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo guardar el producto.';
      if (error instanceof ProductStockError) {
        this.dialogOpen = false;
        this.refresh.emit();
        await this.reload();
      }
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }

  async quickSale(product: Product): Promise<void> {
    if (product.stock < 1 || this.saving || this.refreshing) return;
    this.saving = true;
    try {
      await this.dataService.registerMovement(product.id, 'salida', 1, 'Venta', 'Venta rápida');
      this.message = `Venta registrada: ${product.nombre}`;
      this.refresh.emit();
      await this.reload();
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo guardar la venta.';
    } finally {
      this.saving = false;
      this.changeDetector.markForCheck();
    }
  }

  async downloadCsv(): Promise<void> {
    const rows = [['Código', 'Producto', 'Categoría', 'Stock', 'Mínimo', 'Precio']].concat(
      this.filteredProducts.map((product) => [
        product.codigo,
        product.nombre,
        product.categoria ?? '',
        String(product.stock),
        String(product.stock_minimo),
        String(product.precio),
      ]),
    );
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n');
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.download = 'inventario.csv';
      link.click();
    } catch {
      /* Algunos entornos bloquean las descargas. */
    }
    this.message =
      'Si no se descargó, este entorno bloquea descargas; en el sistema real sí funcionará';
  }

  downloadPdf(): void {
    try {
      if (this.pdfBlobUrl) {
        URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = null;
      }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.text('CONTROL DE INVENTARIO', pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text('INTERNET K-ROL', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, pageWidth / 2, 24, { align: 'center' });

      const head = [['CANTIDADES', 'PRODUCTO', 'COSTO UNITARIO', 'COSTO DE VENTA', 'COSTO TOTAL']];
      const body: string[][] = [];
      let lastCategory = '';
      body.push(['MERCADERÍAS', '', '', '', '']);
      const products = [...this.filteredProducts].sort((a, b) => {
        const ca = (a.categoria || '').localeCompare(b.categoria || '', 'es-GT');
        if (ca !== 0) return ca;
        return (a.nombre || '').localeCompare(b.nombre || '', 'es-GT');
      });
      for (const product of products) {
        const category = product.categoria || '';
        if (category && category !== lastCategory) {
          body.push([category.toUpperCase(), '', '', '', '']);
          lastCategory = category;
        }
        const qty = Number(product.stock) || 0;
        const costoUnit = Number((product as any).costo) || 0;
        const precioVenta = Number(product.precio) || 0;
        const costoTotal = qty * costoUnit;
        body.push([
          qty === 0 ? '' : qty.toString(),
          product.nombre || '',
          costoUnit === 0 ? '' : `Q${costoUnit.toFixed(2)}`,
          precioVenta === 0 ? '' : `Q${precioVenta.toFixed(2)}`,
          costoTotal === 0 ? '' : `Q${costoTotal.toFixed(2)}`,
        ]);
      }
      body.push(['', '', '', '', '']);
      body.push(['NO CORRIENTE', '', '', '', '']);

      autoTable(doc, {
        head,
        body,
        startY: 30,
        styles: { fontSize: 6.5, cellPadding: 1.0 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 16 },
          1: { cellWidth: 90 },
          2: { halign: 'right', cellWidth: 24 },
          3: { halign: 'right', cellWidth: 24 },
          4: { halign: 'right', cellWidth: 24 },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.raw) {
            const row = data.row.raw as string[];
            if (row.length === 5 && row[0] && !row[1] && !row[2] && !row[3] && !row[4]) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.colSpan = 5;
            }
          }
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      let total = 0;
      for (const product of products) {
        const qty = Number(product.stock) || 0;
        const costoUnit = Number((product as any).costo) || 0;
        total += qty * costoUnit;
      }
      doc.setFontSize(8);
      doc.text(`Q${total.toFixed(2)}`, pageWidth - 14, finalY + 6, { align: 'right' });

      const blob = doc.output('blob');
      this.pdfBlobUrl = URL.createObjectURL(blob);
      this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
      this.pdfPreviewOpen = true;
      this.message = 'Previsualización generada. Puedes descargar desde el modal.';
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'No se pudo generar el PDF.';
    }
    this.changeDetector.markForCheck();
  }

  downloadFromPreview(): void {
    if (!this.pdfBlobUrl) return;
    try {
      const link = document.createElement('a');
      link.href = this.pdfBlobUrl;
      link.download = 'Control de inventario.pdf';
      link.click();
    } catch {
      this.message = 'No se pudo descargar el PDF.';
      this.changeDetector.markForCheck();
    }
  }

  closePdfPreview(): void {
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
    this.pdfPreviewUrl = null;
    this.pdfPreviewOpen = false;
  }

  stateLabel(product: Product): string {
    return product.stock === 0
      ? 'Agotado'
      : product.stock <= product.stock_minimo
        ? 'Stock bajo'
        : 'Disponible';
  }

  formatPrice(price: number | null): string {
    return (Number(price) || 0).toFixed(2);
  }

  private nextCode(): string {
    const max = this.data.products.reduce((current, product) => {
      const match = /^P(\d+)$/.exec(product.codigo || '');
      return match ? Math.max(current, Number(match[1])) : current;
    }, 0);
    return `P${String(max + 1).padStart(4, '0')}`;
  }
}

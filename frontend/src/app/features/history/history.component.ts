import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppData, Movement } from '../../core/data/inventory-data.service';

@Component({
  selector: 'app-history',
  imports: [FormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css',
})
export class HistoryComponent {
  @Input({ required: true }) data!: AppData;
  type = '';
  search = '';
  message = '';

  get filteredMovements(): Movement[] {
    const term = this.search.trim().toLocaleLowerCase('es-GT');
    return this.data.movements.filter((movement) => {
      if (this.type && movement.tipo !== this.type) return false;
      const text =
        `${movement.productos?.nombre ?? ''} ${movement.motivo} ${movement.referencia ?? ''}`.toLocaleLowerCase(
          'es-GT',
        );
      return !term || text.includes(term);
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  downloadCsv(): void {
    const rows = [
      ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Motivo', 'Referencia'],
      ...this.data.movements.map((movement) => [
        new Date(movement.creado_en).toISOString(),
        movement.tipo === 'entrada' ? 'Entrada' : 'Salida',
        movement.productos?.nombre ?? '',
        String(movement.cantidad),
        movement.motivo,
        movement.referencia ?? '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n');
    try {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.download = 'movimientos.csv';
      link.click();
    } catch {
      /* Algunos entornos bloquean las descargas. */
    }
    this.message =
      'Si no se descargó, este entorno bloquea descargas; en el sistema real sí funcionará';
  }
}

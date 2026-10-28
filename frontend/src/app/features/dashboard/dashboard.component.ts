import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppData, Product, Movement } from '../../core/data/inventory-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  @Input({ required: true }) data!: AppData;
  @Output() readonly restock = new EventEmitter<number>();
  readonly currency = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });

  get units(): number {
    return this.data.products.reduce((sum, product) => sum + (product.stock || 0), 0);
  }
  get value(): number {
    return this.data.products.reduce(
      (sum, product) => sum + (product.stock || 0) * (Number(product.precio) || 0),
      0,
    );
  }
  get lowStock(): Product[] {
    return this.data.products.filter(
      (product) => product.stock === 0 || product.stock <= product.stock_minimo,
    );
  }
  get cafeToday(): number {
    return this.data.sessions
      .filter((session) => new Date(session.inicio).toDateString() === new Date().toDateString())
      .reduce((sum, session) => sum + (Number(session.total) || 0), 0);
  }
  get recent(): Movement[] {
    return this.data.movements.slice(0, 6);
  }
  format(value: number): string {
    return `Q${value.toFixed(2)}`;
  }
}

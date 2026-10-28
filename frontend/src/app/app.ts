import { Component, OnInit, inject } from '@angular/core';
import { AppShellComponent } from './layout/app-shell.component';
import { AuthService } from './core/auth/auth.service';
@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    void this.auth.initialize();
  }
}

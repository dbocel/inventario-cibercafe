import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  email = '';
  password = '';

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.auth.loading()) return;
    try {
      await this.auth.signIn(this.email.trim(), this.password);
      this.password = '';
    } catch {
      // AuthService expone el mensaje en español para mantenerlo en pantalla.
    }
  }
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'], // Corrected property name
  standalone: false // Explicitly set to false
})
export class AppComponent {
  title = 'task-app';
  isLoggedIn$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router
    ) {
    this.isLoggedIn$ = this.authService.isLoggedIn();
  }

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      // Navigate to login page or home page after logout
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      // Handle logout error (e.g., display a message to the user)
    }
  }
}

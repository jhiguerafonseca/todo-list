import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service'; // Adjusted path

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'], // Corrected property name
  standalone: false // Explicitly set to false
})
export class LoginComponent {
  email!: string; // Definite assignment assertion
  password!: string; // Definite assignment assertion
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  async login(): Promise<void> {
    this.errorMessage = null; // Reset error message
    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }
    try {
      await this.authService.signIn(this.email, this.password);
      this.router.navigate(['/tasks']); // Navigate to tasks page on successful login
    } catch (error: any) { // Catch specific error type if known, else use any
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        this.errorMessage = 'Invalid email or password.';
      } else {
        this.errorMessage = 'An unexpected error occurred. Please try again.';
      }
      console.error('Login error:', error);
    }
  }
}

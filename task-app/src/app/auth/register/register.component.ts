import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service'; // Adjusted path

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'], // Corrected property name
  standalone: false // Explicitly set to false
})
export class RegisterComponent {
  email!: string; // Definite assignment assertion
  password!: string; // Definite assignment assertion
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  async register(): Promise<void> {
    this.errorMessage = null; // Reset error message
    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }
    // Basic password validation (e.g., length) can be added here or with Angular validators
    if (this.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters long.';
        return;
    }

    try {
      await this.authService.signUp(this.email, this.password);
      this.router.navigate(['/tasks']); // Navigate to tasks page on successful registration
    } catch (error: any) { // Catch specific error type if known, else use any
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage = 'The email address is not valid.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'The password is too weak.';
      } else {
        this.errorMessage = 'An unexpected error occurred. Please try again.';
      }
      console.error('Registration error:', error);
    }
  }
}

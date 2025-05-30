import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { TaskComponent } from './task/task.component'; // Assuming TaskComponent is in src/app/task
import { AuthGuard } from './core/auth.guard'; // Import AuthGuard

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'tasks', component: TaskComponent, canActivate: [AuthGuard] }, // Protected route
  { path: '', redirectTo: '/tasks', pathMatch: 'full' },
  { path: '**', redirectTo: '/tasks' } // Optional: Wildcard route for a 404-like redirect
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

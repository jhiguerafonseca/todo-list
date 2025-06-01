import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Task } from './task.model';
import { TaskService } from '../core/task.service'; // Adjusted path
// AuthService might not be directly needed here if TaskService handles user context for its operations
// import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'], // Corrected property name
  standalone: false // Explicitly set to false
})
export class TaskComponent implements OnInit {
  tasks$: Observable<Task[]>;
  newTitle: string = '';
  newDescription: string = '';
  errorMessage: string | null = null; // For displaying errors from write operations

  constructor(
    public taskService: TaskService // Made public to access errorMessage$ in template
    // private authService: AuthService // Only if needed directly for UI logic not covered by TaskService
  ) {
    this.tasks$ = this.taskService.tasks$; // tasks$ for task list
  }

  ngOnInit(): void {
    // tasks$ is already initialized in the constructor via taskService.tasks$
    // If there's any specific logic needed on init related to tasks, it can go here.
    // For example, handling initial loading state if tasks$ doesn't emit immediately.
  }

  async onAddTask(): Promise<void> {
    this.errorMessage = null; // Clear local error for this operation
    if (this.newTitle.trim() === '' || this.newDescription.trim() === '') {
      this.errorMessage = 'Title and Description are required.';
      return;
    }

    try {
      await this.taskService.addTask(this.newTitle, this.newDescription);
      this.newTitle = '';
      this.newDescription = '';
    } catch (error: any) {
      console.error('Error adding task:', error);
      this.errorMessage = error.message || 'Failed to add task.'; // Display error from service or generic
    }
  }

  async onToggleComplete(task: Task): Promise<void> {
    this.errorMessage = null; // Clear local error
    if (!task.id) {
      console.error('Task ID is missing, cannot update completion status.');
      this.errorMessage = 'Task ID is missing. Cannot update.';
      return;
    }
    try {
      await this.taskService.updateTask(task.id, { completed: !task.completed });
    } catch (error: any) {
      console.error('Error toggling task completion:', error);
      this.errorMessage = 'Failed to update task status.'; // Display error from service or generic
    }
  }

  async onDeleteTask(task: Task): Promise<void> {
    this.errorMessage = null; // Clear local error
    if (!task.id) {
      console.error('Task ID is missing, cannot delete task.');
      this.errorMessage = 'Task ID is missing. Cannot delete.';
      return;
    }
    try {
      await this.taskService.deleteTask(task.id);
    } catch (error: any) {
      console.error('Error deleting task:', error);
      this.errorMessage = 'Failed to delete task.'; // Display error from service or generic
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Task } from './task.model';
import { TaskService } from '../core/task.service'; // Adjusted path
// AuthService might not be directly needed here if TaskService handles user context for its operations
// import { AuthService } from '../core/auth.service'; 

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'] // Corrected property name
})
export class TaskComponent implements OnInit {
  tasks$: Observable<Task[]>;
  newTitle: string = '';
  newDescription: string = '';
  errorMessage: string | null = null; // For displaying errors from the service

  constructor(
    private taskService: TaskService
    // private authService: AuthService // Only if needed directly for UI logic not covered by TaskService
  ) {
    this.tasks$ = this.taskService.tasks$;
  }

  ngOnInit(): void {
    // tasks$ is already initialized in the constructor via taskService.tasks$
    // If there's any specific logic needed on init related to tasks, it can go here.
    // For example, handling initial loading state if tasks$ doesn't emit immediately.
  }

  async onAddTask(): Promise<void> {
    this.errorMessage = null;
    if (this.newTitle.trim() === '' || this.newDescription.trim() === '') {
      this.errorMessage = 'Title and Description are required.';
      // alert('Title and Description are required.'); // Replaced with errorMessage
      return;
    }

    try {
      await this.taskService.addTask(this.newTitle, this.newDescription);
      this.newTitle = '';
      this.newDescription = '';
    } catch (error: any) {
      console.error('Error adding task:', error);
      this.errorMessage = error.message || 'Failed to add task. Please ensure you are logged in.';
      // alert('Failed to add task. Please ensure you are logged in.'); // Replaced with errorMessage
    }
  }

  async onToggleComplete(task: Task): Promise<void> {
    if (!task.id) {
      console.error('Task ID is missing, cannot update completion status.');
      this.errorMessage = 'Task ID is missing. Cannot update.';
      return;
    }
    try {
      await this.taskService.updateTask(task.id, { completed: !task.completed });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      this.errorMessage = 'Failed to update task status.';
      // alert('Failed to update task status.'); // Replaced with errorMessage
    }
  }

  async onDeleteTask(task: Task): Promise<void> {
    if (!task.id) {
      console.error('Task ID is missing, cannot delete task.');
      this.errorMessage = 'Task ID is missing. Cannot delete.';
      return;
    }
    // Optional: Add a confirmation dialog before deleting
    // if (!confirm(`Are you sure you want to delete task: "${task.title}"?`)) {
    //   return;
    // }
    try {
      await this.taskService.deleteTask(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
      this.errorMessage = 'Failed to delete task.';
      // alert('Failed to delete task.'); // Replaced with errorMessage
    }
  }
}

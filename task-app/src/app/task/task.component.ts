import { Component } from '@angular/core';
import { Task } from './task.model'; // Import the Task interface

@Component({
  selector: 'app-task',
  // standalone: false, // Not a standalone component
  templateUrl: './task.component.html',
  styleUrl: './task.component.scss'
})
export class TaskComponent {
  tasks: Task[] = [];
  newTitle: string = '';
  newDescription: string = '';

  constructor() { }

  addTask(): void {
    if (this.newTitle.trim() === '' || this.newDescription.trim() === '') {
      // Basic validation, can be enhanced
      alert('Title and Description are required.');
      return;
    }

    const newTask: Task = {
      id: Date.now(), // Simple unique ID generation
      title: this.newTitle,
      description: this.newDescription,
      completed: false
    };

    this.tasks.push(newTask);

    // Reset form fields
    this.newTitle = '';
    this.newDescription = '';
  }

  toggleComplete(task: Task): void {
    task.completed = !task.completed;
  }

  deleteTask(taskToDelete: Task): void {
    this.tasks = this.tasks.filter(task => task.id !== taskToDelete.id);
  }
}

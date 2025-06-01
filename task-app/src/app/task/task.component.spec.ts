import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Observable, of, BehaviorSubject } from 'rxjs';

import { TaskComponent } from './task.component';
import { Task } from './task.model';
import { TaskService } from '../core/task.service';
import { AuthService } from '../core/auth.service'; // Needed for completeness, though TaskService mock handles user interaction

// --- Mock Services ---
class MockAuthService {
  // Mock a logged-in user for TaskService to typically work against
  getCurrentUser(): Observable<any> { // Using 'any' for simplicity if firebase.User is too complex for mock
    return of({ uid: 'test-uid', email: 'test@example.com' });
  }

  isLoggedIn(): Observable<boolean> {
    return of(true); // Assume user is logged in for most TaskComponent tests
  }
}

class MockTaskService {
  private mockTasks = new BehaviorSubject<Task[]>([]);
  tasks$: Observable<Task[]> = this.mockTasks.asObservable();

  // Helper to set tasks for a test
  setTasks(tasks: Task[]) {
    this.mockTasks.next(tasks);
  }

  addTask = jasmine.createSpy('addTask').and.returnValue(Promise.resolve());
  updateTask = jasmine.createSpy('updateTask').and.returnValue(Promise.resolve());
  deleteTask = jasmine.createSpy('deleteTask').and.returnValue(Promise.resolve());
}

describe('TaskComponent', () => {
  let component: TaskComponent;
  let fixture: ComponentFixture<TaskComponent>;
  let mockTaskService: MockTaskService;
  // let mockAuthService: MockAuthService; // Not directly used by component methods but good for setup

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaskComponent],
      imports: [FormsModule],
      providers: [
        { provide: TaskService, useClass: MockTaskService },
        { provide: AuthService, useClass: MockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskComponent);
    component = fixture.componentInstance;
    mockTaskService = TestBed.inject(TaskService) as unknown as MockTaskService;
    // mockAuthService = TestBed.inject(AuthService) as unknown as MockAuthService;
    // fixture.detectChanges(); // Initial detectChanges call will be in individual tests or describe blocks
  });

  it('should create', () => {
    fixture.detectChanges(); // Needed for ngOnInit to run if tasks$ is used immediately
    expect(component).toBeTruthy();
  });

  describe('Initial State and Task Display', () => {
    it('should display "No tasks yet" message when tasks$ is empty', fakeAsync(() => {
      mockTaskService.setTasks([]);
      fixture.detectChanges(); // Trigger change detection for async pipe
      tick(); // Settle async operations
      fixture.detectChanges(); // Update view with new data

      const noTasksMessage = fixture.debugElement.query(By.css('.text-lg'));
      expect(noTasksMessage).toBeTruthy();
      expect(noTasksMessage.nativeElement.textContent).toContain('No tasks yet. Add one above!');
    }));

    it('should display tasks when tasks$ emits data', fakeAsync(() => {
      const tasks: Task[] = [
        { id: '1', title: 'Task 1', description: 'Desc 1', userId: 'uid1', completed: false, createdAt: new Date() },
        { id: '2', title: 'Task 2', description: 'Desc 2', userId: 'uid1', completed: true, createdAt: new Date() }
      ];
      mockTaskService.setTasks(tasks);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const taskElements = fixture.debugElement.queryAll(By.css('ul li'));
      expect(taskElements.length).toBe(2);
      expect(taskElements[0].nativeElement.textContent).toContain('Task 1');
      expect(taskElements[1].nativeElement.textContent).toContain('Task 2');
    }));
  });

  describe('onAddTask method', () => {
    beforeEach(() => {
      fixture.detectChanges(); // For form bindings
    });

    it('should call taskService.addTask with title and description and reset form', async () => {
      component.newTitle = 'New Test Task';
      component.newDescription = 'New Test Description';
      await component.onAddTask();
      expect(mockTaskService.addTask).toHaveBeenCalledWith('New Test Task', 'New Test Description');
      expect(component.newTitle).toBe('');
      expect(component.newDescription).toBe('');
      expect(component.errorMessage).toBeNull();
    });

    it('should not call taskService.addTask if title is empty and set error message', async () => {
      component.newTitle = '';
      component.newDescription = 'Description';
      await component.onAddTask();
      expect(mockTaskService.addTask).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Title and Description are required.');
    });

    it('should display error message if taskService.addTask fails', async () => {
      mockTaskService.addTask.and.returnValue(Promise.reject(new Error('Failed to add')));
      component.newTitle = 'Test';
      component.newDescription = 'Desc';
      await component.onAddTask();
      expect(component.errorMessage).toBe('Failed to add');
    });
  });

  describe('onToggleComplete method', () => {
    const mockTask: Task = { id: '1', title: 'Test', description: 'Desc', userId: 'uid1', completed: false, createdAt: new Date() };

    it('should call taskService.updateTask with correct parameters', async () => {
      await component.onToggleComplete(mockTask);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith('1', { completed: true });
    });

    it('should display error message if taskService.updateTask fails', async () => {
      mockTaskService.updateTask.and.returnValue(Promise.reject(new Error('Update failed')));
      await component.onToggleComplete(mockTask);
      expect(component.errorMessage).toBe('Failed to update task status.');
    });

    it('should not call taskService.updateTask if task id is missing', async () => {
      const taskWithoutId: Task = { title: 'Test', description: 'Desc', userId: 'uid1', completed: false };
      await component.onToggleComplete(taskWithoutId);
      expect(mockTaskService.updateTask).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Task ID is missing. Cannot update.');
    });
  });

  describe('onDeleteTask method', () => {
    const mockTask: Task = { id: '1', title: 'Test', description: 'Desc', userId: 'uid1', completed: false, createdAt: new Date() };

    it('should call taskService.deleteTask with task id', async () => {
      await component.onDeleteTask(mockTask);
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('1');
    });

    it('should display error message if taskService.deleteTask fails', async () => {
      mockTaskService.deleteTask.and.returnValue(Promise.reject(new Error('Delete failed')));
      await component.onDeleteTask(mockTask);
      expect(component.errorMessage).toBe('Failed to delete task.');
    });

    it('should not call taskService.deleteTask if task id is missing', async () => {
      const taskWithoutId: Task = { title: 'Test', description: 'Desc', userId: 'uid1', completed: false };
      await component.onDeleteTask(taskWithoutId);
      expect(mockTaskService.deleteTask).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Task ID is missing. Cannot delete.');
    });
  });
});

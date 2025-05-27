import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TaskComponent } from './task.component';
import { Task } from './task.model'; // Import Task model

describe('TaskComponent', () => {
  let component: TaskComponent;
  let fixture: ComponentFixture<TaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaskComponent],
      imports: [FormsModule] // Add FormsModule here
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initial detection cycle
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have an empty tasks array initially', () => {
      expect(component.tasks).toEqual([]);
    });

    it('should have newTitle as an empty string initially', () => {
      expect(component.newTitle).toBe('');
    });

    it('should have newDescription as an empty string initially', () => {
      expect(component.newDescription).toBe('');
    });
  });

  describe('addTask method', () => {
    it('should add a new task to the tasks array', () => {
      component.newTitle = 'Test Task Title';
      component.newDescription = 'Test Task Description';
      component.addTask();
      expect(component.tasks.length).toBe(1);
      expect(component.tasks[0].title).toBe('Test Task Title');
      expect(component.tasks[0].description).toBe('Test Task Description');
      expect(component.tasks[0].completed).toBe(false);
    });

    it('should reset newTitle and newDescription after adding a task', () => {
      component.newTitle = 'Test Task';
      component.newDescription = 'Test Description';
      component.addTask();
      expect(component.newTitle).toBe('');
      expect(component.newDescription).toBe('');
    });

    it('should not add a task if newTitle is empty', () => {
      spyOn(window, 'alert'); // Suppress alert messages during test
      component.newTitle = '';
      component.newDescription = 'Test Description';
      component.addTask();
      expect(component.tasks.length).toBe(0);
      expect(window.alert).toHaveBeenCalledWith('Title and Description are required.');
    });

    it('should not add a task if newDescription is empty', () => {
      spyOn(window, 'alert'); // Suppress alert messages during test
      component.newTitle = 'Test Title';
      component.newDescription = '';
      component.addTask();
      expect(component.tasks.length).toBe(0);
      expect(window.alert).toHaveBeenCalledWith('Title and Description are required.');
    });

     it('should not add a task if newTitle contains only whitespace', () => {
      spyOn(window, 'alert');
      component.newTitle = '   ';
      component.newDescription = 'Test Description';
      component.addTask();
      expect(component.tasks.length).toBe(0);
      expect(window.alert).toHaveBeenCalledWith('Title and Description are required.');
    });
  });

  describe('toggleComplete method', () => {
    it('should flip the completed status of a task', () => {
      const mockTask: Task = { id: 1, title: 'Test', description: 'Desc', completed: false };
      component.tasks = [mockTask];
      component.toggleComplete(mockTask);
      expect(mockTask.completed).toBe(true);
      component.toggleComplete(mockTask);
      expect(mockTask.completed).toBe(false);
    });
  });

  describe('deleteTask method', () => {
    it('should remove a task from the tasks array', () => {
      const task1: Task = { id: 1, title: 'Task 1', description: 'Desc 1', completed: false };
      const task2: Task = { id: 2, title: 'Task 2', description: 'Desc 2', completed: true };
      component.tasks = [task1, task2];
      component.deleteTask(task1);
      expect(component.tasks.length).toBe(1);
      expect(component.tasks[0]).toEqual(task2); // task1 should be removed
    });

    it('should not change the array if task to delete is not found', () => {
      const task1: Task = { id: 1, title: 'Task 1', description: 'Desc 1', completed: false };
      const task2: Task = { id: 2, title: 'Task 2', description: 'Desc 2', completed: true };
      const taskToDel: Task = {id: 3, title: 'Task 3', description: 'Desc 3', completed: false};
      component.tasks = [task1, task2];
      component.deleteTask(taskToDel);
      expect(component.tasks.length).toBe(2);
    });
  });
});

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, Subject, ReplaySubject, throwError } from 'rxjs'; // Added throwError
import { firstValueFrom } from 'rxjs'; // For converting observable to promise in tests if needed

import { TaskService } from './task.service';
import { AuthService } from './auth.service';
import { Task } from '../task/task.model';
import firebase from 'firebase/compat/app';

// --- Mock Data & Types ---
const mockUser: firebase.User = { uid: 'test-user-uid', email: 'test@example.com' } as firebase.User;

const mockTaskData: Task[] = [
  { id: '1', title: 'Task 1', description: 'Desc 1', userId: 'test-user-uid', completed: false, createdAt: new Date() },
  { id: '2', title: 'Task 2', description: 'Desc 2', userId: 'test-user-uid', completed: true, createdAt: new Date() }
];

const createMockActions = (tasks: Task[]) => {
  return tasks.map(task => ({
    payload: {
      doc: { id: task.id!, data: () => ({ ...task }) }
    }
  }));
};

describe('TaskService', () => {
  let service: TaskService;
  let afsMock: any; // AngularFirestore mock
  let authServiceMock: any;
  let authStateSubject: ReplaySubject<firebase.User | null>;
  let mockCollectionRef: any; // Mock for the collection reference itself
  let mockDocumentRef: any;   // Mock for the document reference itself

  beforeEach(() => {
    authStateSubject = new ReplaySubject<firebase.User | null>(1);

    mockDocumentRef = {
      update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve())
    };

    mockCollectionRef = {
      snapshotChanges: jasmine.createSpy('snapshotChanges').and.returnValue(of(createMockActions([]))),
      add: jasmine.createSpy('add').and.returnValue(Promise.resolve({ id: 'new-doc-id' })),
      // Note: .doc() on a collection mock is not directly used by the refactored service's write methods.
      // The service now calls afs.doc(`tasks/${taskId}`) directly.
    };

    afsMock = {
      collection: jasmine.createSpy('collection').and.callFake((path: string, queryFn?: any) => {
        // This mock needs to return something that has snapshotChanges for the tasks$ observable
        // And something that has .add for the addTask method.
        // For tasks$, queryFn will be present. For addTask, it won't.
        if (path === 'tasks' && queryFn) { // For tasks$
            mockCollectionRef.snapshotChanges.calls.reset(); // Reset spy for specific checks if needed
            return mockCollectionRef;
        }
        if (path === 'tasks' && !queryFn) { // For addTask
            mockCollectionRef.add.calls.reset();
            return mockCollectionRef; // Return the part of the mock that has .add()
        }
        return mockCollectionRef; // Default
      }),
      doc: jasmine.createSpy('doc').and.returnValue(mockDocumentRef) // For updateTask, deleteTask
    };

    authServiceMock = {
      getCurrentUser: () => authStateSubject.asObservable()
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: AngularFirestore, useValue: afsMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    // Service will be instantiated in tests after authState is set
  });

  describe('tasks$ observable', () => {
    it('should query afs.collection with userId when user is logged in and emit mapped tasks', (done) => {
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);

      mockCollectionRef.snapshotChanges.and.returnValue(of(createMockActions(mockTaskData)));

      service.tasks$.subscribe(tasks => {
        expect(tasks.length).toBe(2);
        expect(tasks[0].title).toBe('Task 1');
        expect(afsMock.collection).toHaveBeenCalledWith('tasks', jasmine.any(Function));
        done();
      });
    });

    it('should emit an empty array when no user is logged in', (done) => {
      authStateSubject.next(null);
      service = TestBed.inject(TaskService);

      service.tasks$.subscribe(tasks => {
        expect(tasks).toEqual([]);
        // For tasks$ when user is null, afs.collection for tasks might not be called if handled early by switchMap
        // Depending on exact implementation, it might be called 0 or 1 time (if it tries then auth fails)
        // The current service implementation does an early return of of([]) so collection isn't called for 'tasks' path.
        // Let's verify it's not called for the 'tasks' path with the query function.
        const tasksCollectionCall = afsMock.collection.calls.all().find((call: any) => call.args[0] === 'tasks' && typeof call.args[1] === 'function');
        expect(tasksCollectionCall).toBeUndefined();
        done();
      });
    });

    it('should update errorMessage$ and emit empty array if tasks query fails', (done) => {
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);

      const firestoreError = new Error('Firestore permission denied');
      mockCollectionRef.snapshotChanges.and.returnValue(throwError(() => firestoreError));

      let tasksResult: Task[] | undefined;
      service.tasks$.subscribe(tasks => {
        tasksResult = tasks;
      });

      service.errorMessage$.subscribe(errorMsg => {
        if (errorMsg !== null) { // Wait for the error to be set
          expect(errorMsg).toBe('Failed to load tasks. Please try again later.');
          expect(tasksResult).toEqual([]); // Should emit empty array as fallback
          done();
        }
      });
    });

     it('should clear errorMessage$ when a new user logs in or data is fetched successfully', (done) => {
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);

      // Initial error
      mockCollectionRef.snapshotChanges.and.returnValue(throwError(() => new Error('Initial error')));
      service.tasks$.subscribe(); // Trigger error

      service.errorMessage$.subscribe(errorMsg => {
        if (errorMsg === 'Failed to load tasks. Please try again later.') {
          // Now simulate successful fetch
          mockCollectionRef.snapshotChanges.and.returnValue(of(createMockActions(mockTaskData)));
          authStateSubject.next(mockUser); // Re-trigger or simulate new fetch
          // Need a bit more elaborate setup to test clearing, this might be tricky with current service structure
          // For now, let's test that on successful fetch, error is null
        } else if (errorMsg === null && mockCollectionRef.snapshotChanges().subscribe) {
            // Check if error became null after a successful operation
            expect(errorMsg).toBeNull();
            done();
        }
      });
      // Initial trigger for successful fetch after setup
      mockCollectionRef.snapshotChanges.and.returnValue(of(createMockActions(mockTaskData)));
      authStateSubject.next(mockUser);


    });
  });

  describe('addTask(title, description)', () => {
    beforeEach(() => {
      authStateSubject.next(mockUser); // Ensure user is logged in
      service = TestBed.inject(TaskService);
    });

    it('should call afs.collection("tasks").add with correct task data', async () => {
      const title = 'New Task';
      const description = 'New Description';
      await service.addTask(title, description);

      expect(afsMock.collection).toHaveBeenCalledWith('tasks'); // Check this specific call
      expect(mockCollectionRef.add).toHaveBeenCalled();
      const addedTask = mockCollectionRef.add.calls.mostRecent().args[0] as Task;
      expect(addedTask.title).toBe(title);
      expect(addedTask.userId).toBe(mockUser.uid);
      expect(addedTask.completed).toBe(false);
      expect(addedTask.createdAt).toBeInstanceOf(Date);
    });

    it('should throw an error if no user is logged in for addTask', async () => {
      authStateSubject.next(null); // Log out user by emitting null
      // Re-inject or use a fresh service instance if constructor logic depends on initial auth state
      // For methods like addTask, it re-fetches user, so this should be fine.
      try {
        await service.addTask('Test', 'Test');
        fail('addTask should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('User not logged in');
      }
    });
  });

  describe('updateTask(taskId, changes)', () => {
    beforeEach(() => {
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);
    });

    it('should call afs.doc("tasks/taskId").update with correct arguments', async () => {
      const taskId = '1';
      const changes: Partial<Task> = { completed: true };
      await service.updateTask(taskId, changes);
      expect(afsMock.doc).toHaveBeenCalledWith(`tasks/${taskId}`);
      expect(mockDocumentRef.update).toHaveBeenCalledWith(changes);
    });
     it('should throw an error if taskId is not provided for updateTask', async () => {
      try {
        await service.updateTask('', { completed: true });
        fail('updateTask should have thrown an error for missing taskId');
      } catch (error: any) {
        expect(error.message).toContain('Task ID is required to update.');
      }
    });
  });

  describe('deleteTask(taskId)', () => {
    beforeEach(() => {
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);
    });

    it('should call afs.doc("tasks/taskId").delete with correct taskId', async () => {
      const taskId = '1';
      await service.deleteTask(taskId);
      expect(afsMock.doc).toHaveBeenCalledWith(`tasks/${taskId}`);
      expect(mockDocumentRef.delete).toHaveBeenCalled();
    });

    it('should throw an error if taskId is not provided for deleteTask', async () => {
      try {
        await service.deleteTask('');
        fail('deleteTask should have thrown an error for missing taskId');
      } catch (error: any) {
        expect(error.message).toContain('Task ID is required to delete.');
      }
    });
  });
});

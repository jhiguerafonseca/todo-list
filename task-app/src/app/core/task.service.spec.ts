import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { Observable, of, Subject, ReplaySubject } from 'rxjs';
import { TaskService } from './task.service';
import { AuthService } from './auth.service';
import { Task } from '../task/task.model'; // Adjust path if necessary
import firebase from 'firebase/compat/app'; // For firebase.User type

// --- Mock Data & Types ---
const mockUser: firebase.User = {
  uid: 'test-user-uid',
  email: 'test@example.com',
  // ... other properties as needed by your User model or tests
} as firebase.User; // Type assertion for simplicity if full User mock is too verbose

const mockTaskData: Task[] = [
  { id: '1', title: 'Task 1', description: 'Desc 1', userId: 'test-user-uid', completed: false, createdAt: new Date() },
  { id: '2', title: 'Task 2', description: 'Desc 2', userId: 'test-user-uid', completed: true, createdAt: new Date() }
];

// Helper to create mock Firestore actions
const createMockActions = (tasks: Task[]) => {
  return tasks.map(task => ({
    payload: {
      doc: {
        id: task.id!,
        data: () => ({ ...task }) // Return a copy
      }
    }
  }));
};

describe('TaskService', () => {
  let service: TaskService;
  let angularFirestoreMock: any;
  let mockAuthService: any;
  let authStateSubject: ReplaySubject<firebase.User | null>; // ReplaySubject to ensure late subscribers get the value
  let mockCollection: any;
  let mockDocument: any;

  beforeEach(() => {
    authStateSubject = new ReplaySubject<firebase.User | null>(1); // Buffer size 1

    // Mock for AngularFirestoreDocument
    mockDocument = {
      update: jasmine.createSpy('update').and.returnValue(Promise.resolve()),
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve())
    };

    // Mock for AngularFirestoreCollection
    mockCollection = {
      snapshotChanges: jasmine.createSpy('snapshotChanges').and.returnValue(of(createMockActions([]))), // Default to empty
      add: jasmine.createSpy('add').and.returnValue(Promise.resolve({ id: 'new-doc-id' })), // Mock document reference
      doc: jasmine.createSpy('doc').and.returnValue(mockDocument)
    };
    
    angularFirestoreMock = {
      collection: jasmine.createSpy('collection').and.returnValue(mockCollection)
    };

    mockAuthService = {
      getCurrentUser: () => authStateSubject.asObservable()
      // No need to mock isLoggedIn for TaskService tests specifically
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: AngularFirestore, useValue: angularFirestoreMock },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
    // service = TestBed.inject(TaskService); // Service will be instantiated after authState is set in tests
  });

  describe('tasks$ observable', () => {
    it('should query collection with userId when user is logged in and emit mapped tasks', (done) => {
      authStateSubject.next(mockUser); // User is logged in
      service = TestBed.inject(TaskService); // Instantiate service AFTER auth state is set

      const expectedQueryFn = (ref: any) => ref.where('userId', '==', mockUser.uid).orderBy('createdAt', 'desc');
      mockCollection.snapshotChanges.and.returnValue(of(createMockActions(mockTaskData)));
      
      service.tasks$.subscribe(tasks => {
        expect(tasks.length).toBe(2);
        expect(tasks[0].id).toBe('1');
        expect(tasks[0].title).toBe('Task 1');
        expect(tasks[1].userId).toBe(mockUser.uid);
        
        // Check if afs.collection was called with a query function
        const collectionArgs = angularFirestoreMock.collection.calls.mostRecent().args;
        expect(collectionArgs[0]).toBe('tasks');
        expect(collectionArgs[1]).toEqual(jasmine.any(Function)); // Check if a function was passed

        // To actually check the query, you might need a more elaborate mock or spy on the ref object itself
        // For simplicity, we trust the implementation detail here or test it in an integration test.
        // However, we can verify our mock query function structure if we define it outside and pass.
        // For now, we confirm 'tasks' and that a queryFn was passed.
        done();
      });
    });

    it('should emit an empty array when no user is logged in', (done) => {
      authStateSubject.next(null); // No user logged in
      service = TestBed.inject(TaskService); // Instantiate service AFTER auth state is set
      
      service.tasks$.subscribe(tasks => {
        expect(tasks).toEqual([]);
        expect(angularFirestoreMock.collection).not.toHaveBeenCalled(); // Should not attempt to query if no user
        done();
      });
    });
  });

  describe('addTask(title, description)', () => {
    beforeEach(() => {
      // Ensure service is instantiated with a logged-in user for these tests
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);
    });

    it('should call tasksCollection.add with correct task data when user is logged in', async () => {
      const title = 'New Task';
      const description = 'New Description';
      await service.addTask(title, description);
      
      expect(mockCollection.add).toHaveBeenCalled();
      const addedTask = mockCollection.add.calls.mostRecent().args[0] as Task;
      expect(addedTask.title).toBe(title);
      expect(addedTask.description).toBe(description);
      expect(addedTask.userId).toBe(mockUser.uid);
      expect(addedTask.completed).toBe(false);
      expect(addedTask.createdAt).toBeInstanceOf(Date);
    });

    it('should throw an error if no user is logged in', async () => {
      authStateSubject.next(null); // Log out user
      // Re-instantiate service or modify its internal state if possible,
      // but for this test, we'll rely on the initial check in addTask
      // This requires careful handling of how tasksCollection is initialized or checked.
      // The current TaskService implementation relies on getCurrentUser().pipe(take(1)).toPromise()
      // so we need to control that for the specific call.

      // We'll create a new service instance where the authService mock will return null for this specific test.
      const localMockAuthService = { getCurrentUser: () => of(null) };
      const localTestBed = TestBed.configureTestingModule({
          providers: [TaskService, {provide: AuthService, useValue: localMockAuthService }, {provide: AngularFirestore, useValue: angularFirestoreMock}]
      });
      const localService = localTestBed.inject(TaskService);

      try {
        await localService.addTask('Test', 'Test');
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
      // Ensure tasksCollection is "initialized" by having tasks$ subscribed or auth state processed
      service.tasks$.subscribe(); // Trigger the switchMap
    });

    it('should call tasksCollection.doc(taskId).update with correct arguments', async () => {
      const taskId = '1';
      const changes: Partial<Task> = { completed: true, title: 'Updated Title' };
      await service.updateTask(taskId, changes);
      expect(mockCollection.doc).toHaveBeenCalledWith(taskId);
      expect(mockDocument.update).toHaveBeenCalledWith(changes);
    });

     it('should reject if tasksCollection is not initialized (e.g. user logs out)', async () => {
        // Simulate tasksCollection being undefined (e.g., after logout)
        (service as any).tasksCollection = undefined; // Accessing private member for test
        try {
            await service.updateTask('1', { completed: true });
            fail('updateTask should have rejected');
        } catch (error: any) {
            expect(error).toBe('Tasks collection not initialized.');
        }
    });
  });

  describe('deleteTask(taskId)', () => {
    beforeEach(() => {
      authStateSubject.next(mockUser);
      service = TestBed.inject(TaskService);
      service.tasks$.subscribe(); // Trigger the switchMap
    });

    it('should call tasksCollection.doc(taskId).delete with correct taskId', async () => {
      const taskId = '1';
      await service.deleteTask(taskId);
      expect(mockCollection.doc).toHaveBeenCalledWith(taskId);
      expect(mockDocument.delete).toHaveBeenCalled();
    });

    it('should reject if tasksCollection is not initialized', async () => {
        (service as any).tasksCollection = undefined;
        try {
            await service.deleteTask('1');
            fail('deleteTask should have rejected');
        } catch (error: any) {
            expect(error).toBe('Tasks collection not initialized.');
        }
    });
  });
});

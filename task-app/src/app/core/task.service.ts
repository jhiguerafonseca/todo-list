import { Injectable, Injector, runInInjectionContext } from '@angular/core'; // Added Injector, runInInjectionContext
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, firstValueFrom, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { Task } from '../task/task.model';
import { AuthService } from './auth.service';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  tasks$: Observable<Task[]>;
  private _errorMessage$ = new BehaviorSubject<string | null>(null);
  public errorMessage$: Observable<string | null> = this._errorMessage$.asObservable();

  constructor(
    private afs: AngularFirestore,
    private authService: AuthService,
    private injector: Injector // Injected Injector
  ) {
    this.tasks$ = this.authService.getCurrentUser().pipe(
      tap(() => this._errorMessage$.next(null)),
      switchMap((user: firebase.User | null) => {
        if (user && user.uid) {
          this._errorMessage$.next(null);
          return this.afs.collection<Task>('tasks', ref =>
            ref.where('userId', '==', user.uid).orderBy('createdAt', 'desc')
          ).snapshotChanges().pipe(
            map(actions => {
              this._errorMessage$.next(null);
              return actions.map(a => {
                const data = a.payload.doc.data() as Task;
                const id = a.payload.doc.id;
                return { id, ...data };
              });
            }),
            catchError(error => {
              console.error('Error fetching tasks:', error);
              this._errorMessage$.next('Failed to load tasks. Please try again later.');
              return of([]);
            })
          );
        } else {
          this._errorMessage$.next(null);
          return of([]);
        }
      }),
      catchError(error => {
        console.error('Error in user authentication stream:', error);
        this._errorMessage$.next('Authentication error. Cannot fetch tasks.');
        return of([]);
      })
    );
  }

  async addTask(title: string, description: string): Promise<void> {
    this._errorMessage$.next(null);
    const user = await firstValueFrom(this.authService.getCurrentUser());
    if (!user || !user.uid) {
      throw new Error('User not logged in. Cannot add task.');
    }

    // Wrap Firestore operations in runInInjectionContext
    return runInInjectionContext(this.injector, async () => {
      const tasksCollectionRef = this.afs.collection<Task>('tasks');
      const newTask: Task = {
        userId: user.uid,
        title,
        description,
        completed: false,
        createdAt: new Date()
      };
      await tasksCollectionRef.add(newTask);
    });
  }

  async updateTask(taskId: string, changes: Partial<Task>): Promise<void> {
    this._errorMessage$.next(null);
    if (!taskId) {
        throw new Error('Task ID is required to update.');
    }
    // As per instructions, not wrapping this yet unless proven necessary.
    // If this.afs.doc() or .update() internally use inject() after an await (if any were added),
    // this might also need runInInjectionContext.
    const taskDocRef = this.afs.doc<Task>(`tasks/${taskId}`);
    await taskDocRef.update(changes);
  }

  async deleteTask(taskId: string): Promise<void> {
    this._errorMessage$.next(null);
    if (!taskId) {
        throw new Error('Task ID is required to delete.');
    }
    // Similarly, not wrapping this yet.
    const taskDocRef = this.afs.doc<Task>(`tasks/${taskId}`);
    await taskDocRef.delete();
  }
}

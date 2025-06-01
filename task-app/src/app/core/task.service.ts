import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, firstValueFrom, BehaviorSubject } from 'rxjs'; // Added BehaviorSubject
import { map, switchMap, catchError, tap } from 'rxjs/operators'; // Added tap
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
    private authService: AuthService
  ) {
    this.tasks$ = this.authService.getCurrentUser().pipe(
      tap(() => this._errorMessage$.next(null)), // Clear previous errors on user change
      switchMap((user: firebase.User | null) => {
        if (user && user.uid) {
          this._errorMessage$.next(null); // Clear error on successful user fetch
          return this.afs.collection<Task>('tasks', ref =>
            ref.where('userId', '==', user.uid).orderBy('createdAt', 'desc')
          ).snapshotChanges().pipe(
            map(actions => {
              this._errorMessage$.next(null); // Clear error on successful data fetch
              return actions.map(a => {
                const data = a.payload.doc.data() as Task;
                const id = a.payload.doc.id;
                return { id, ...data };
              });
            }),
            catchError(error => {
              console.error('Error fetching tasks:', error);
              this._errorMessage$.next('Failed to load tasks. Please try again later.');
              return of([]); // Return empty array on error to keep the stream alive
            })
          );
        } else {
          this._errorMessage$.next(null); // No user, so no error related to fetching tasks for a user
          return of([]);
        }
      }),
      catchError(error => { // Catch errors from authService.getCurrentUser() itself
        console.error('Error in user authentication stream:', error);
        this._errorMessage$.next('Authentication error. Cannot fetch tasks.');
        return of([]);
      })
    );
  }

  async addTask(title: string, description: string): Promise<void> {
    this._errorMessage$.next(null); // Clear previous service errors
    const user = await firstValueFrom(this.authService.getCurrentUser());
    if (!user || !user.uid) {
      throw new Error('User not logged in. Cannot add task.');
    }

    const tasksCollectionRef = this.afs.collection<Task>('tasks');
    const newTask: Task = {
      userId: user.uid,
      title,
      description,
      completed: false,
      createdAt: new Date()
    };
    await tasksCollectionRef.add(newTask);
  }

  async updateTask(taskId: string, changes: Partial<Task>): Promise<void> {
    this._errorMessage$.next(null);
    if (!taskId) {
        throw new Error('Task ID is required to update.');
    }
    // Consider re-fetching user or ensuring user context if rules depend on it for updates
    // For now, assuming Firestore rules handle unauthorized updates if user context changed.
    const taskDocRef = this.afs.doc<Task>(`tasks/${taskId}`);
    await taskDocRef.update(changes);
  }

  async deleteTask(taskId: string): Promise<void> {
    this._errorMessage$.next(null);
    if (!taskId) {
        throw new Error('Task ID is required to delete.');
    }
    const taskDocRef = this.afs.doc<Task>(`tasks/${taskId}`);
    await taskDocRef.delete();
  }
}

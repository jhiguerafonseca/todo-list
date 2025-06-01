import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Task } from '../task/task.model'; // Assuming path, adjust if TaskComponent was moved or model is elsewhere
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasksCollection?: AngularFirestoreCollection<Task>; // Optional because it depends on user login
  tasks$: Observable<Task[]>;

  constructor(
    private afs: AngularFirestore,
    private authService: AuthService
  ) {
    this.tasks$ = this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (user) {
          // User is logged in, set up the collection and stream tasks
          this.tasksCollection = this.afs.collection<Task>('tasks', ref =>
            ref.where('userId', '==', user.uid).orderBy('createdAt', 'desc') // Optional: order by creation time
          );
          return this.tasksCollection.snapshotChanges().pipe(
            map(actions => {
              return actions.map(a => {
                const data = a.payload.doc.data() as Task;
                const id = a.payload.doc.id;
                return { id, ...data };
              });
            })
          );
        } else {
          // User is not logged in, tasksCollection remains undefined
          this.tasksCollection = undefined;
          // Return an observable of an empty array
          return of([]);
        }
      })
    );
  }

  async addTask(title: string, description: string): Promise<void> {
    const user = await this.authService.getCurrentUser().pipe(take(1)).toPromise();
    if (!user) {
      throw new Error('User not logged in. Cannot add task.');
    }
    if (!this.tasksCollection) {
      // This case should ideally not be hit if tasks$ logic is correct and UI prevents adding when not logged in
      throw new Error('Tasks collection not initialized. User might not be fully logged in or collection setup failed.');
    }

    const newTask: Task = {
      userId: user.uid,
      title,
      description,
      completed: false,
      createdAt: new Date() // Optional: add a timestamp
    };
    await this.tasksCollection.add(newTask);
  }

  updateTask(taskId: string, changes: Partial<Task>): Promise<void> {
    if (!this.tasksCollection) {
      return Promise.reject('Tasks collection not initialized.');
    }
    // Ensure `updatedAt` is part of changes if you want to track updates
    // changes.updatedAt = new Date();
    return this.tasksCollection.doc(taskId).update(changes);
  }

  deleteTask(taskId: string): Promise<void> {
    if (!this.tasksCollection) {
      return Promise.reject('Tasks collection not initialized.');
    }
    return this.tasksCollection.doc(taskId).delete();
  }
}

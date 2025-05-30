import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app'; // For firebase.User type
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router
  ) { }

  signUp(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.afAuth.createUserWithEmailAndPassword(email, password);
  }

  signIn(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  signOut(): Promise<void> {
    return this.afAuth.signOut();
  }

  getCurrentUser(): Observable<firebase.User | null> {
    return this.afAuth.authState;
  }

  isLoggedIn(): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => !!user)
    );
  }
}

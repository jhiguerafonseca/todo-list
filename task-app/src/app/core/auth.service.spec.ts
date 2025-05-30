import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of, Subject } from 'rxjs'; // Use Subject for more control over authState

import { AuthService } from './auth.service';
import firebase from 'firebase/compat/app'; // For firebase.User type

// --- Mock Data ---
const mockUser: firebase.User = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: () => Promise.resolve(),
  getIdToken: () => Promise.resolve('test-token'),
  getIdTokenResult: () => Promise.resolve({ token: 'test-token', claims: {}, authTime: '', expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null }),
  linkWithCredential: () => Promise.resolve({} as firebase.auth.UserCredential), // Cast to UserCredential
  linkWithPopup: () => Promise.resolve({} as firebase.auth.UserCredential),
  linkWithRedirect: () => Promise.resolve(),
  reauthenticateWithCredential: () => Promise.resolve({} as firebase.auth.UserCredential),
  reauthenticateWithPopup: () => Promise.resolve({} as firebase.auth.UserCredential),
  reauthenticateWithRedirect: () => Promise.resolve(),
  reload: () => Promise.resolve(),
  sendEmailVerification: () => Promise.resolve(),
  toJSON: () => ({}),
  unlink: () => Promise.resolve({} as firebase.User), // Cast to User
  updateEmail: () => Promise.resolve(),
  updatePassword: () => Promise.resolve(),
  updatePhoneNumber: () => Promise.resolve(),
  updateProfile: () => Promise.resolve(),
  verifyBeforeUpdateEmail: () => Promise.resolve(),
  getPhoneNumber: () => null, // Added to satisfy firebase.User interface
  providerId: 'firebase' // Added to satisfy firebase.UserInfo interface, part of firebase.User
};


describe('AuthService', () => {
  let service: AuthService;
  let angularFireAuthMock: any;
  let routerMock: any;
  let authStateSubject: Subject<firebase.User | null>;

  beforeEach(() => {
    authStateSubject = new Subject<firebase.User | null>();

    angularFireAuthMock = {
      authState: authStateSubject.asObservable(), // Controlled observable
      createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword'),
      signInWithEmailAndPassword: jasmine.createSpy('signInWithEmailAndPassword'),
      signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve())
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AngularFireAuth, useValue: angularFireAuthMock },
        { provide: Router, useValue: routerMock }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentUser()', () => {
    it('should return the user object when authState emits a user', (done) => {
      service.getCurrentUser().subscribe(user => {
        expect(user).toEqual(mockUser);
        done();
      });
      authStateSubject.next(mockUser); // Emit mock user
    });

    it('should return null when authState emits null', (done) => {
      service.getCurrentUser().subscribe(user => {
        expect(user).toBeNull();
        done();
      });
      authStateSubject.next(null); // Emit null
    });
  });

  describe('isLoggedIn()', () => {
    it('should return true when authState emits a user', (done) => {
      service.isLoggedIn().subscribe(isLoggedIn => {
        expect(isLoggedIn).toBe(true);
        done();
      });
      authStateSubject.next(mockUser);
    });

    it('should return false when authState emits null', (done) => {
      service.isLoggedIn().subscribe(isLoggedIn => {
        expect(isLoggedIn).toBe(false);
        done();
      });
      authStateSubject.next(null);
    });
  });

  describe('signUp(email, password)', () => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    const mockUserCredential = { user: { uid: 'new-uid', ...mockUser } } as firebase.auth.UserCredential;


    it('should call angularFireAuth.createUserWithEmailAndPassword with correct arguments', async () => {
      angularFireAuthMock.createUserWithEmailAndPassword.and.returnValue(Promise.resolve(mockUserCredential));
      await service.signUp(testEmail, testPassword);
      expect(angularFireAuthMock.createUserWithEmailAndPassword).toHaveBeenCalledWith(testEmail, testPassword);
    });

    it('should return user credential on successful sign-up', async () => {
      angularFireAuthMock.createUserWithEmailAndPassword.and.returnValue(Promise.resolve(mockUserCredential));
      const result = await service.signUp(testEmail, testPassword);
      expect(result).toEqual(mockUserCredential);
    });

    it('should throw an error if Firebase throws an error during sign-up', async () => {
      const firebaseError = new Error('Firebase error: email already in use');
      angularFireAuthMock.createUserWithEmailAndPassword.and.returnValue(Promise.reject(firebaseError));
      try {
        await service.signUp(testEmail, testPassword);
        fail('Expected signUp to throw an error'); // Should not reach here
      } catch (error: any) {
        expect(error).toEqual(firebaseError);
      }
    });
  });

  describe('signIn(email, password)', () => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    const mockUserCredential = { user: { uid: 'test-uid', ...mockUser } } as firebase.auth.UserCredential;

    it('should call angularFireAuth.signInWithEmailAndPassword with correct arguments', async () => {
      angularFireAuthMock.signInWithEmailAndPassword.and.returnValue(Promise.resolve(mockUserCredential));
      await service.signIn(testEmail, testPassword);
      expect(angularFireAuthMock.signInWithEmailAndPassword).toHaveBeenCalledWith(testEmail, testPassword);
    });

    it('should return user credential on successful sign-in', async () => {
      angularFireAuthMock.signInWithEmailAndPassword.and.returnValue(Promise.resolve(mockUserCredential));
      const result = await service.signIn(testEmail, testPassword);
      expect(result).toEqual(mockUserCredential);
    });

    it('should throw an error if Firebase throws an error during sign-in', async () => {
      const firebaseError = new Error('Firebase error: invalid credentials');
      angularFireAuthMock.signInWithEmailAndPassword.and.returnValue(Promise.reject(firebaseError));
      try {
        await service.signIn(testEmail, testPassword);
        fail('Expected signIn to throw an error');
      } catch (error: any) {
        expect(error).toEqual(firebaseError);
      }
    });
  });

  describe('signOut()', () => {
    it('should call angularFireAuth.signOut', async () => {
      await service.signOut();
      expect(angularFireAuthMock.signOut).toHaveBeenCalled();
    });

    // The router navigation was removed from the AuthService.signOut() method in a previous step.
    // If it were still there, the test would be:
    // it('should call router.navigate with ["/login"] after successful sign-out', fakeAsync(() => {
    //   service.signOut();
    //   tick(); // allow promise to resolve
    //   expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    // }));

    it('should complete successfully even if router navigation is not present', async () => {
        await expectAsync(service.signOut()).toBeResolved();
    });
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Authentication service with real API integration
class AuthService {
  private currentUser: any = null;
  private authStateListeners: ((user: any) => void)[] = [];
  private registeredUsers: any[] = [];

  constructor() {
    this.loadStoredUser();
    this.loadRegisteredUsers();
    
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '1037985236626-im6lbdis9q5g1bptng6g22ods7mf4bjh.apps.googleusercontent.com', // From your google-services.json
      offlineAccess: true,
    });
  }

  // Load stored user from AsyncStorage
  private async loadStoredUser() {
    try {
      const storedUser = await AsyncStorage.getItem('currentUser');
      const authToken = await AsyncStorage.getItem('authToken');
      if (storedUser && authToken) {
        this.currentUser = JSON.parse(storedUser);
        this.notifyAuthStateListeners(this.currentUser);
        console.log('Loaded stored user:', this.currentUser.uid);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    }
  }

  // Load registered users from AsyncStorage
  private async loadRegisteredUsers() {
    try {
      const storedUsers = await AsyncStorage.getItem('registeredUsers');
      if (storedUsers) {
        this.registeredUsers = JSON.parse(storedUsers);
      }
    } catch (error) {
      console.error('Error loading registered users:', error);
    }
  }

  // Save user to AsyncStorage
  private async saveUserToStorage(user: any, token?: string) {
    try {
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));
      if (token) {
        await AsyncStorage.setItem('authToken', token);
      }
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }

  // Save registered users to AsyncStorage
  private async saveRegisteredUsers() {
    try {
      await AsyncStorage.setItem('registeredUsers', JSON.stringify(this.registeredUsers));
    } catch (error) {
      console.error('Error saving registered users:', error);
    }
  }

  // Register new user (local only)
  async registerUser(userData: any): Promise<any> {
    try {
      console.log('Registering new user locally...');
      return this.registerUserLocal(userData);
    } catch (error) {
      console.error('User registration error:', error);
      throw error;
    }
  }

  // Local storage registration (fallback)
  private async registerUserLocal(userData: any): Promise<any> {
    try {
      console.log('Registering new user locally...');
      
      // Check if email already exists
      const existingUser = this.registeredUsers.find(user => user.email === userData.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Create new user
      const newUser = {
        uid: 'user-' + Date.now(),
        id: 'user-' + Date.now(),
        email: userData.email,
        password: userData.password, // In real app, this should be hashed
        companyName: userData.companyName,
        phoneNumber: userData.phoneNumber,
        displayName: userData.companyName,
        name: userData.companyName,
        isAnonymous: false,
        photoURL: null,
        providerId: 'email',
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
      };

      // Add to registered users
      this.registeredUsers.push(newUser);
      await this.saveRegisteredUsers();

      // Set as current user
      this.currentUser = newUser;
      await this.saveUserToStorage(newUser);

      console.log('User registration successful locally:', newUser.uid);
      return { user: newUser };
    } catch (error) {
      console.error('User registration error:', error);
      throw error;
    }
  }

  // Email/Password sign-in (local only)
  async signInWithEmail(email: string, password: string): Promise<any> {
    try {
      console.log('Email sign-in locally...');
      return this.signInWithEmailLocal(email, password);
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }

  // Local storage sign-in (fallback)
  private async signInWithEmailLocal(email: string, password: string): Promise<any> {
    try {
      console.log('Email sign-in locally...');
      
      // Find user by email
      const user = this.registeredUsers.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Update last sign-in time
      user.metadata.lastSignInTime = new Date().toISOString();
      
      // Set as current user
      this.currentUser = user;
      await this.saveUserToStorage(user);
      this.notifyAuthStateListeners(user);

      console.log('Email sign-in successful locally:', user.uid);
      return { user };
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }

  // Google Sign-In implementation (local only)
  async signInWithGoogle(): Promise<any> {
    try {
      console.log('Google Sign-In started...');
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      
      console.log('Google Sign-In user info:', userInfo);
      
      // Use local storage only
      return this.signInWithGoogleLocal(userInfo);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      
      // Handle specific Google Sign-In errors
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error('Sign in was cancelled by user');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services not available');
      } else if (error.code === 'SIGN_IN_REQUIRED') {
        throw new Error('Sign in required');
      } else {
        throw new Error('Google Sign-In failed. Please try again.');
      }
    }
  }

  // Local Google sign-in (fallback)
  private async signInWithGoogleLocal(userInfo: any): Promise<any> {
    // Create user object from Google data
    const googleUser = {
      uid: 'google-' + userInfo.user.id,
      id: 'google-' + userInfo.user.id,
      email: userInfo.user.email,
      displayName: userInfo.user.name,
      name: userInfo.user.name,
      isAnonymous: false,
      photoURL: userInfo.user.photo,
      phoneNumber: null,
      providerId: 'google',
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      googleData: {
        idToken: userInfo.idToken,
        serverAuthCode: userInfo.serverAuthCode,
      }
    };

    // Check if user already exists in registered users
    const existingUser = this.registeredUsers.find(user => user.email === googleUser.email);
    
    if (existingUser) {
      // Update existing user with Google data
      existingUser.displayName = googleUser.displayName;
      existingUser.name = googleUser.name;
      existingUser.photoURL = googleUser.photoURL;
      existingUser.providerId = 'google';
      existingUser.metadata.lastSignInTime = new Date().toISOString();
      existingUser.googleData = googleUser.googleData;
      
      this.currentUser = existingUser;
      await this.saveUserToStorage(existingUser);
      await this.saveRegisteredUsers();
    } else {
      // Create new user from Google data
      const newUser = {
        ...googleUser,
        companyName: googleUser.displayName, // Use Google name as company name
        password: '', // No password for Google users
      };
      
      this.registeredUsers.push(newUser);
      this.currentUser = newUser;
      await this.saveUserToStorage(newUser);
      await this.saveRegisteredUsers();
    }
    
    this.notifyAuthStateListeners(this.currentUser);
    
    console.log('Google Sign-In successful locally:', this.currentUser.uid);
    return { user: this.currentUser };
  }

  // Simple anonymous sign-in
  async signInAnonymously(): Promise<any> {
    try {
      console.log('Mock Anonymous Sign-In started...');
      
      // Create a mock anonymous user
      const mockUser = {
        uid: 'anon-user-' + Date.now(),
        email: null,
        displayName: 'Anonymous User',
        isAnonymous: true,
        photoURL: null,
        phoneNumber: null,
        providerId: 'anonymous',
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
      };

      this.currentUser = mockUser;
      await this.saveUserToStorage(mockUser);
      this.notifyAuthStateListeners(mockUser);
      
      console.log('Mock Anonymous Sign-In successful:', mockUser.uid);
      return { user: mockUser };
    } catch (error) {
      console.error('Mock Anonymous Sign-In Error:', error);
      throw error;
    }
  }

  // Sign out (local only)
  async signOut(): Promise<void> {
    try {
      console.log('Signing out user...');
      
      // Sign out from Google if user was signed in with Google
      if (this.currentUser?.providerId === 'google') {
        try {
          await GoogleSignin.signOut();
          console.log('Google Sign-Out successful');
        } catch (googleError) {
          console.error('Google Sign-Out error:', googleError);
        }
      }
      
      this.currentUser = null;
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('authToken');
      this.notifyAuthStateListeners(null);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current user profile (local only)
  async getUserProfile(): Promise<any> {
    return this.currentUser;
  }

  // Update user profile (local only)
  async updateUserProfile(profileData: any): Promise<any> {
    try {
      // Update current user locally
      this.currentUser = { ...this.currentUser, ...profileData };
      await this.saveUserToStorage(this.currentUser);
      
      return this.currentUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): any {
    return this.currentUser;
  }

  // Check if user is signed in with Google
  async isSignedInWithGoogle(): Promise<boolean> {
    try {
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      return false;
    }
  }

  // Get current Google user info
  async getCurrentGoogleUser(): Promise<any> {
    try {
      return await GoogleSignin.getCurrentUser();
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }

  // Initialize auth service (ensure stored user is loaded)
  async initialize(): Promise<void> {
    try {
      await this.loadStoredUser();
      await this.loadRegisteredUsers();
      
      // Check if user is already signed in with Google
      const isGoogleSignedIn = await this.isSignedInWithGoogle();
      if (isGoogleSignedIn && !this.currentUser) {
        console.log('User is signed in with Google but not in local storage, attempting to restore session...');
        try {
          await this.signInWithGoogle();
        } catch (error) {
          console.error('Failed to restore Google session:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
    }
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: any) => void) {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Notify all auth state listeners
  private notifyAuthStateListeners(user: any) {
    this.authStateListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }
}

export default new AuthService(); 
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { LandingPageData, HistoryItem } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAkd2Ojzo1kNr1SbNszqJ7sllgZI629iDw",
  authDomain: "zeshan-testing.firebaseapp.com",
  projectId: "zeshan-testing",
  storageBucket: "zeshan-testing.firebasestorage.app",
  messagingSenderId: "779354459746",
  appId: "1:779354459746:web:e35c971f008f724dec8b3b",
  measurementId: "G-WVZC8NXBRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Handle Analytics initialization safely
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.debug("Analytics initialization skipped");
}

const db = getFirestore(app);
const auth = getAuth(app);

// --- Auth State Management with Offline Fallback ---

// We need to track the user manually to support "Mock Users" when Firebase Auth is unconfigured
let currentMockUser: User | null = null;
const authSubscribers: Array<(user: User | null) => void> = [];

const notifySubscribers = (user: User | null) => {
  authSubscribers.forEach(cb => cb(user));
};

// Helper to create a fake user object that satisfies the Firebase User interface
const createMockUser = (email: string, displayName: string, isAnonymous: boolean): User => ({
  uid: 'offline_' + Date.now(),
  email,
  displayName,
  emailVerified: false,
  isAnonymous,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
} as unknown as User);

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  // Add to our local subscribers list
  authSubscribers.push(callback);
  
  // Trigger immediately with current state
  callback(currentMockUser || auth.currentUser);

  // Subscribe to real Firebase Auth changes
  const unsubscribeFirebase = onAuthStateChanged(auth, (user) => {
    // Only update if we aren't using a mock user override
    if (!currentMockUser) {
      callback(user);
    }
  });

  return () => {
    const index = authSubscribers.indexOf(callback);
    if (index > -1) authSubscribers.splice(index, 1);
    unsubscribeFirebase();
  };
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
  // Clear mock user if exists
  if (currentMockUser) {
    currentMockUser = null;
    notifySubscribers(null);
  }
};

// --- Firestore Helper for Users ---
const saveUserToFirestore = async (user: User, provider: string, additionalData: any = {}) => {
  if (!user || user.uid.startsWith('offline_')) return;
  
  try {
    const userRef = doc(db, "users", user.uid);
    const userData = {
      uid: user.uid,
      displayName: user.displayName || 'User',
      email: user.email || '',
      last_login: serverTimestamp(),
      auth_provider: provider,
      ...additionalData
    };

    await setDoc(userRef, userData, { merge: true });
  } catch (e) {
    console.warn("Failed to save user data to Firestore:", e);
  }
};

// --- Auth Functions with Fallback ---

export const registerWithEmail = async (name: string, email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update Auth Profile
    await updateProfile(userCredential.user, { displayName: name });
    
    // Save to Firestore under users/{uid}
    // We explicitly pass 'name' and 'email' here to ensure they appear in the Firestore document
    await saveUserToFirestore(userCredential.user, 'email', { 
        created_at: serverTimestamp(),
        name: name,
        email: email,
        displayName: name
    });

    currentMockUser = null;
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
      console.warn("Email Auth disabled. Falling back to offline mode.");
      const mock = createMockUser(email, name, false);
      currentMockUser = mock;
      notifySubscribers(mock);
      return mock;
    }
    console.error("Registration Error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Update last login
    await saveUserToFirestore(userCredential.user, 'email');
    currentMockUser = null;
    return userCredential.user;
  } catch (error: any) {
    // Check for config errors that require offline fallback
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
      console.warn("Email Auth disabled. Falling back to offline mode.");
      const name = email.split('@')[0];
      const mock = createMockUser(email, name, false);
      currentMockUser = mock;
      notifySubscribers(mock);
      return mock;
    }

    // Only log unexpected system errors. 
    if (error.code !== 'auth/invalid-credential' && error.code !== 'auth/user-not-found' && error.code !== 'auth/wrong-password') {
        console.error("Login Error:", error);
    }
    throw error;
  }
};

// --- Firestore Functions ---

// Helper to ensure we have a user (Real or Mock)
const getCurrentUser = (): User | null => {
  return currentMockUser || auth.currentUser;
};

export const saveProjectToFirestore = async (data: LandingPageData, html: string): Promise<HistoryItem> => {
  const user = getCurrentUser();
  
  // If we are offline/mock user, throw error to force local storage fallback
  if (!user || user.uid.startsWith('offline_')) {
    throw new Error("Offline mode - utilizing local storage fallback");
  }

  try {
    // Generate page_id (slug) from page name
    const slug = data.pageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'landing-page';
    
    // Create a "file-like" document ID as requested: e.g., my-page-timestamp.html
    const fileId = `${slug}-${Date.now()}.html`;

    // Prepare payload matching user requirements exactly
    // Collection: "users/{uid}/landing_pages"
    const payload = {
      created_at: serverTimestamp(), // Timestamp
      html_content: html,            // String
      "live-url": "",                // String
      page_id: fileId,               // String (using fileId as page_id for consistency)
      status: "pending",             // String
      
      // Additional internal metadata
      userId: user.uid,
      data: data
    };

    // Save to subcollection under the user: users/UID/landing_pages/FILE_ID
    const docRef = doc(db, "users", user.uid, "landing_pages", fileId);
    await setDoc(docRef, payload);

    return {
      id: fileId,
      timestamp: Date.now(),
      data,
      html
    };
  } catch (error: any) {
    // Check for permission denied and throw a specific error message for App.tsx to handle
    if (error.code === 'permission-denied') {
      console.warn("Firestore Permission Denied - switching to local storage fallback.");
      throw new Error("permission-denied");
    }
    console.error("Firestore Save Error:", error);
    throw error;
  }
};

export const fetchProjectsFromFirestore = async (): Promise<HistoryItem[]> => {
  const user = getCurrentUser();
  
  if (!user || user.uid.startsWith('offline_')) {
    return []; // Return empty for mock users, let App.tsx load from local storage
  }

  try {
    // Query subcollection: users/{uid}/landing_pages
    const pagesRef = collection(db, "users", user.uid, "landing_pages");
    const q = query(pagesRef);
    
    const querySnapshot = await getDocs(q);
    
    const items = querySnapshot.docs.map(doc => {
      const d = doc.data();
      
      // Handle timestamp mapping
      const timestamp = d.created_at?.toMillis 
        ? d.created_at.toMillis() 
        : (d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now());
      
      // Handle html content mapping
      const html = d.html_content || d.html || "";

      return {
        id: doc.id,
        timestamp: timestamp,
        data: d.data as LandingPageData,
        html: html,
        userId: user.uid // we know it belongs to this user
      };
    });

    // Client-side sort by newest first
    return items.sort((a, b) => b.timestamp - a.timestamp);

  } catch (error: any) {
    // If permissions are denied, return empty array so app falls back to local storage
    if (error.code === 'permission-denied' || error.code === 'unavailable') {
      console.warn("Firestore access denied/unavailable. Falling back to local storage.");
      return [];
    }
    console.error("Error fetching from Firestore:", error);
    return [];
  }
};

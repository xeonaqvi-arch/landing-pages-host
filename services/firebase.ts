import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
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

// Handle Analytics initialization safely (might fail in some environments)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.debug("Analytics initialization skipped");
}

const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- Auth Functions ---

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const registerWithEmail = async (name: string, email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update the user's display name
    await updateProfile(userCredential.user, {
      displayName: name
    });
    return userCredential.user;
  } catch (error) {
    console.error("Registration Error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Anonymous Auth Error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper to ensure user is authenticated before DB operations
// Returns User if successful, null if auth fails (enabling offline fallback)
const ensureAuth = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    // Check if we already have a user
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        // If we reach here in ensureAuth, it implies a DB operation was requested 
        // without an active user. We will try anonymous login as a fallback 
        // to ensure the DB operation can proceed if the rules allow it.
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch((error) => {
            if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
                console.warn("⚠️ Firebase Auth Warning: Anonymous sign-in is disabled in the Firebase Console.");
                console.warn("Falling back to local storage (Offline Mode).");
            } else {
                console.error("Firebase Auth Error:", error);
            }
            resolve(null);
          });
      }
    });
  });
};

// --- Firestore Functions ---

export const saveProjectToFirestore = async (data: LandingPageData, html: string): Promise<HistoryItem> => {
  const user = await ensureAuth();
  
  // If auth failed, throw error to trigger local storage fallback in App.tsx
  if (!user) {
    throw new Error("Firebase Auth unavailable - utilizing local storage fallback");
  }

  try {
    const docRef = await addDoc(collection(db, "landingpages"), {
      userId: user.uid, // Associate data with the user
      data,
      html,
      createdAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      timestamp: Date.now(),
      data,
      html
    };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error("Firestore Permission Denied: Check your Firestore Security Rules.");
    }
    throw error;
  }
};

export const fetchProjectsFromFirestore = async (): Promise<HistoryItem[]> => {
  const user = await ensureAuth();
  
  // If auth failed, return empty array to trigger local storage load in App.tsx
  if (!user) {
    console.warn("Skipping Firestore fetch due to auth failure");
    return [];
  }

  try {
    const q = query(
      collection(db, "landingpages"), 
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    
    const items = querySnapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        timestamp: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now(),
        data: d.data as LandingPageData,
        html: d.html as string
      };
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);

  } catch (error: any) {
    if (error.code === 'permission-denied' || error.code === 'unavailable') {
      console.warn("Firestore unavailable/denied. Using local history.");
      return [];
    }
    console.error("Error fetching from Firestore:", error);
    return [];
  }
};
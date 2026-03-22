import { db, auth } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { User, Search, Report, BlacklistEntry } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createUserProfile = async (user: User) => {
  try {
    await setDoc(doc(db, 'users', user.uid), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
  }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};

export const decrementCredits = async (uid: string, currentCredits: number, currentApiUsage: number = 0) => {
  try {
    await updateDoc(doc(db, 'users', uid), { 
      credits: currentCredits - 1,
      api_usage: currentApiUsage + 1
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const saveSearch = async (search: Omit<Search, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'searches'), search);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'searches');
  }
};

export const getRecentSearches = async (userId: string, limitCount: number = 5): Promise<Search[]> => {
  try {
    const q = query(
      collection(db, 'searches'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Search));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'searches');
    return [];
  }
};

export const submitReport = async (report: Omit<Report, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'reports'), report);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reports');
  }
};

export const deleteBlacklistEntry = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'blacklist', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `blacklist/${id}`);
  }
};

export const addBlacklistEntry = async (entry: Omit<BlacklistEntry, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'blacklist'), entry);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'blacklist');
  }
};

export const checkBlacklist = async (identifier: string): Promise<BlacklistEntry | null> => {
  try {
    const q = query(collection(db, 'blacklist'), where('identifier', '==', identifier));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as BlacklistEntry;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'blacklist');
    return null;
  }
};

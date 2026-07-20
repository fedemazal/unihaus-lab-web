import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./config";
import type { UserProfile, UserRole } from "@/types";

export async function registerUser(
  email: string,
  password: string,
  nombre: string,
  telefono: string,
  inmobiliariaNombre: string
) {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  const user = credential.user;

  await setDoc(doc(getFirebaseDb(), "users", user.uid), {
    uid: user.uid,
    email,
    nombre,
    telefono,
    rol: "agente" as UserRole,
    estado: "pendiente",
    inmobiliariaId: null,
    inmobiliariaSugerida: inmobiliariaNombre,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signOut() {
  return firebaseSignOut(getFirebaseAuth());
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(getFirebaseDb(), "users", uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { ...docSnap.data(), uid: docSnap.id } as UserProfile;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

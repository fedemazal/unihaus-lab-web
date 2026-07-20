import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type {
  Inmobiliaria,
  Production,
  UserProfile,
} from "@/types";

// ============================================
// USERS
// ============================================

export async function getUsers(estado?: string) {
  const usersRef = collection(getFirebaseDb(), "users");
  const q = estado
    ? query(usersRef, where("estado", "==", estado))
    : query(usersRef);
  const snapshot = await getDocs(q);
  const users = snapshot.docs.map((doc) => ({ ...doc.data(), uid: doc.id } as UserProfile));
  // Sort client-side to avoid requiring Firestore index
  return users.sort((a, b) => {
    const dateA = a.createdAt ? (typeof a.createdAt === "object" && "toDate" in a.createdAt ? (a.createdAt as { toDate: () => Date }).toDate() : new Date(a.createdAt as unknown as string)) : new Date(0);
    const dateB = b.createdAt ? (typeof b.createdAt === "object" && "toDate" in b.createdAt ? (b.createdAt as { toDate: () => Date }).toDate() : new Date(b.createdAt as unknown as string)) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  return { ...snap.data(), uid: snap.id } as UserProfile;
}

export async function updateUser(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(getFirebaseDb(), "users", uid);
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
}

// ============================================
// INMOBILIARIAS
// ============================================

export async function getInmobiliarias(onlyActive = false) {
  const ref = collection(getFirebaseDb(), "inmobiliarias");
  const q = onlyActive
    ? query(ref, where("activa", "==", true))
    : query(ref);
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Inmobiliaria));
  return items.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

export async function createInmobiliaria(data: Omit<Inmobiliaria, "id" | "createdAt" | "updatedAt">) {
  const ref = collection(getFirebaseDb(), "inmobiliarias");
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateInmobiliaria(id: string, data: Partial<Inmobiliaria>) {
  const ref = doc(getFirebaseDb(), "inmobiliarias", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function getInmobiliaria(id: string) {
  const ref = doc(getFirebaseDb(), "inmobiliarias", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Inmobiliaria;
}

// ============================================
// PRODUCCIONES
// ============================================

export async function createProduction(data: Omit<Production, "id" | "createdAt" | "updatedAt">) {
  const ref = collection(getFirebaseDb(), "producciones");
  const docRef = await addDoc(ref, {
    ...data,
    fechaSolicitud: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getProductions(filters?: {
  agenteId?: string;
  estado?: string;
  inmobiliariaId?: string;
}) {
  const ref = collection(getFirebaseDb(), "producciones");
  const constraints: ReturnType<typeof where>[] = [];

  if (filters?.agenteId) constraints.push(where("agenteId", "==", filters.agenteId));
  if (filters?.estado) constraints.push(where("estado", "==", filters.estado));
  if (filters?.inmobiliariaId) constraints.push(where("inmobiliariaId", "==", filters.inmobiliariaId));

  const q = constraints.length > 0
    ? query(ref, ...constraints)
    : query(ref);
  const snapshot = await getDocs(q);
  const prods = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Production));
  return prods.sort((a, b) => {
    const dateA = a.createdAt ? (typeof a.createdAt === "object" && "toDate" in a.createdAt ? (a.createdAt as { toDate: () => Date }).toDate() : new Date(a.createdAt as unknown as string)) : new Date(0);
    const dateB = b.createdAt ? (typeof b.createdAt === "object" && "toDate" in b.createdAt ? (b.createdAt as { toDate: () => Date }).toDate() : new Date(b.createdAt as unknown as string)) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
}

export async function getProduction(id: string) {
  const ref = doc(getFirebaseDb(), "producciones", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Production;
}

export async function deleteProduction(id: string) {
  const { deleteDoc } = await import("firebase/firestore");
  const ref = doc(getFirebaseDb(), "producciones", id);
  await deleteDoc(ref);
}

export async function updateProduction(id: string, data: Partial<Production>) {
  const ref = doc(getFirebaseDb(), "producciones", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// Helper to convert Firestore Timestamp to Date
export function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return timestamp;
}

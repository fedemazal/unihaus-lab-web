import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type {
  ArchivoR2,
  BeneficiosConfig,
  CodigoDescuento,
  Inmobiliaria,
  MaterialPreparacion,
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
  const ref = doc(getFirebaseDb(), "producciones", id);
  await deleteDoc(ref);
}

export async function updateProduction(id: string, data: Partial<Production>) {
  const ref = doc(getFirebaseDb(), "producciones", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

// ============================================
// MATERIALES DE PREPARACIÓN
// ============================================

export async function getMateriales() {
  const ref = collection(getFirebaseDb(), "materiales_preparacion");
  let snapshot;
  try {
    const q = query(ref, orderBy("orden", "asc"));
    snapshot = await getDocs(q);
  } catch {
    snapshot = await getDocs(query(ref));
  }
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as MaterialPreparacion));
}

export async function createMaterial(data: Omit<MaterialPreparacion, "id" | "createdAt" | "updatedAt">) {
  const ref = collection(getFirebaseDb(), "materiales_preparacion");
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateMaterial(id: string, data: Partial<MaterialPreparacion>) {
  const ref = doc(getFirebaseDb(), "materiales_preparacion", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteMaterial(id: string) {
  const ref = doc(getFirebaseDb(), "materiales_preparacion", id);
  await deleteDoc(ref);
}

// Helper to convert Firestore Timestamp to Date
export function toDate(timestamp: Timestamp | Date | null): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return timestamp;
}

// ============================================
// ENTREGAS R2
// ============================================

// Marca una producción como entregada con los archivos subidos a R2
export async function setEntregaActiva(produccionId: string, archivos: ArchivoR2[], diasExpiracion = 15) {
  const ref = doc(getFirebaseDb(), "producciones", produccionId);
  const uploadedAt = new Date();
  const expiresAt = new Date(uploadedAt.getTime() + diasExpiracion * 24 * 60 * 60 * 1000);
  await updateDoc(ref, {
    entregaStatus: "activa",
    entregaArchivos: archivos,
    entregaUploadedAt: Timestamp.fromDate(uploadedAt),
    entregaExpiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
  });
}

// Marca una producción como archivada (archivos ya borrados de R2)
export async function setEntregaArchivada(produccionId: string) {
  const ref = doc(getFirebaseDb(), "producciones", produccionId);
  await updateDoc(ref, {
    entregaStatus: "archivada",
    entregaArchivos: [],
    updatedAt: serverTimestamp(),
  });
}

// Devuelve producciones con entrega activa cuyo expiresAt ya venció
export async function getEntregasVencidas(): Promise<Production[]> {
  const ref = collection(getFirebaseDb(), "producciones");
  const q = query(ref, where("entregaStatus", "==", "activa"));
  const snap = await getDocs(q);
  const ahora = new Date();
  return snap.docs
    .map((d) => ({ ...d.data(), id: d.id } as Production))
    .filter((p) => {
      if (!p.entregaExpiresAt) return false;
      const exp = p.entregaExpiresAt instanceof Timestamp
        ? p.entregaExpiresAt.toDate()
        : new Date(p.entregaExpiresAt as unknown as string);
      return exp < ahora;
    });
}

// ============================================
// BENEFICIOS CONFIG
// ============================================

export const DEFAULT_BENEFICIOS_CONFIG: BeneficiosConfig = {
  capa1: [
    { min: 5, max: 10, porcentaje: 5 },
    { min: 11, max: 20, porcentaje: 7.5 },
    { min: 21, max: null, porcentaje: 10 },
  ],
  capa2: [
    { producciones: 15, beneficio: "drone_gratis", descripcion: "1 sesión de drone gratis, a elección del agente en cualquier producción futura" },
    { producciones: 20, beneficio: "produccion_gratis", descripcion: "1 producción completa gratis: Fotos + 2 Videos + Plano (deptos hasta 100m²)" },
  ],
  capa3: { porcentaje: 5, minServicios: 4 },
  bonoBienvenida: 40,
  prepago: { cantidad: 10, descuento: 10 },
  beneficiosChicos: [
    "Remover muebles de las imágenes (hasta 3 fotos por producción)",
    "Remover personas o imperfecciones (hasta 3 fotos por producción)",
    "Cambio de cielo gris por soleado en espacios exteriores",
    "1 amoblamiento virtual gratis por producción",
  ],
};

export async function getBeneficiosConfig(): Promise<BeneficiosConfig> {
  try {
    const ref = doc(getFirebaseDb(), "config", "beneficios");
    const snap = await getDoc(ref);
    if (!snap.exists()) return DEFAULT_BENEFICIOS_CONFIG;
    return snap.data() as BeneficiosConfig;
  } catch {
    return DEFAULT_BENEFICIOS_CONFIG;
  }
}

export async function saveBeneficiosConfig(config: BeneficiosConfig) {
  const ref = doc(getFirebaseDb(), "config", "beneficios");
  await setDoc(ref, config);
}

export function computeCapa1(count: number, tiers: BeneficiosConfig["capa1"]): number {
  for (const tier of [...tiers].sort((a, b) => b.min - a.min)) {
    if (count >= tier.min && (tier.max === null || count <= tier.max)) {
      return tier.porcentaje;
    }
  }
  return 0;
}

export async function getProduccionesCountMes(inmobiliariaId: string, year: number, month: number): Promise<number> {
  const ref = collection(getFirebaseDb(), "producciones");
  const q = query(ref, where("inmobiliariaId", "==", inmobiliariaId));
  const snap = await getDocs(q);
  return snap.docs.filter((d) => {
    const data = d.data();
    const fecha = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt ?? 0);
    return fecha.getFullYear() === year && fecha.getMonth() === month;
  }).length;
}

// ============================================
// CÓDIGOS DE DESCUENTO
// ============================================

export async function getCodigos(): Promise<CodigoDescuento[]> {
  const ref = collection(getFirebaseDb(), "codigos_descuento");
  const snap = await getDocs(query(ref));
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as CodigoDescuento));
  return items.sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""));
}

export async function createCodigo(data: Omit<CodigoDescuento, "id" | "createdAt" | "updatedAt" | "cantidadUsada">) {
  const ref = collection(getFirebaseDb(), "codigos_descuento");
  const docRef = await addDoc(ref, {
    ...data,
    cantidadUsada: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCodigo(id: string, data: Partial<CodigoDescuento>) {
  const ref = doc(getFirebaseDb(), "codigos_descuento", id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCodigo(id: string) {
  const ref = doc(getFirebaseDb(), "codigos_descuento", id);
  await deleteDoc(ref);
}

export async function validateCodigo(codigo: string): Promise<CodigoDescuento | null> {
  const ref = collection(getFirebaseDb(), "codigos_descuento");
  const q = query(ref, where("codigo", "==", codigo.toUpperCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = { ...snap.docs[0].data(), id: snap.docs[0].id } as CodigoDescuento;
  if (!data.activo) return null;
  if (data.cantidadUsada >= data.cantidadTotal) return null;
  return data;
}

export async function usarCodigo(codigoId: string): Promise<boolean> {
  const db = getFirebaseDb();
  const ref = doc(db, "codigos_descuento", codigoId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Código no existe");
      const data = snap.data() as CodigoDescuento;
      if (!data.activo || data.cantidadUsada >= data.cantidadTotal) {
        throw new Error("Código agotado");
      }
      tx.update(ref, { cantidadUsada: data.cantidadUsada + 1, updatedAt: serverTimestamp() });
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================
// CUENTA CORRIENTE
// ============================================

export const LIMITE_CC = 400;
export const DIAS_PLAZO_CC = 90;
export const RECARGO_MORA_CC = 0.05; // 5% mensual

export interface CCResumenInmobiliaria {
  inmobiliariaId: string;
  inmobiliariaNombre: string;
  saldoPendiente: number;
  producciones: number;
  diasDesdeFirstEntrega: number | null;
  enMora: boolean;
  bloqueada: boolean;
  agentesCC: { uid: string; nombre: string; email: string }[];
}

// Devuelve el resumen CC de una inmobiliaria dado sus producciones CC impagadas
export function calcularResumenCC(
  inmobiliariaId: string,
  inmobiliariaNombre: string,
  prodsCC: import("@/types").Production[],
  agentesCC: { uid: string; nombre: string; email: string }[]
): CCResumenInmobiliaria {
  const impagadas = prodsCC.filter(
    (p) => p.esCuentaCorriente && !p.pagada && p.estado === "listo"
  );
  const saldoPendiente = impagadas.reduce((sum, p) => sum + (p.precioFinal ?? 0), 0);

  let diasDesdeFirstEntrega: number | null = null;
  let enMora = false;
  if (impagadas.length > 0) {
    const fechas = impagadas.map((p) => {
      const f = p.fechaListo;
      return f instanceof Timestamp ? f.toDate() : new Date(f as unknown as string);
    });
    const oldest = new Date(Math.min(...fechas.map((d) => d.getTime())));
    diasDesdeFirstEntrega = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24));
    enMora = diasDesdeFirstEntrega > DIAS_PLAZO_CC;
  }

  const bloqueada = saldoPendiente >= LIMITE_CC || enMora;

  return {
    inmobiliariaId,
    inmobiliariaNombre,
    saldoPendiente,
    producciones: impagadas.length,
    diasDesdeFirstEntrega,
    enMora,
    bloqueada,
    agentesCC,
  };
}

// Obtiene todos los usuarios con CC aprobada
export async function getUsuariosCC(): Promise<import("@/types").UserProfile[]> {
  const ref = collection(getFirebaseDb(), "users");
  const snap = await getDocs(query(ref));
  return snap.docs
    .map((d) => ({ ...d.data(), uid: d.id } as import("@/types").UserProfile))
    .filter((u) => u.cuentaCorrienteAprobada === true);
}

// Verifica si un agente CC está bloqueado para nueva producción
export async function isCCBloqueada(inmobiliariaId: string): Promise<boolean> {
  const ref = collection(getFirebaseDb(), "producciones");
  const q = query(
    ref,
    where("inmobiliariaId", "==", inmobiliariaId),
    where("esCuentaCorriente", "==", true)
  );
  const snap = await getDocs(q);
  const prods = snap.docs.map((d) => ({ ...d.data(), id: d.id } as import("@/types").Production));
  const impagadas = prods.filter((p) => !p.pagada && p.estado === "listo");
  const saldo = impagadas.reduce((sum, p) => sum + (p.precioFinal ?? 0), 0);
  if (saldo >= LIMITE_CC) return true;
  if (impagadas.length > 0) {
    const fechas = impagadas.map((p) => {
      const f = p.fechaListo;
      return f instanceof Timestamp ? f.toDate() : new Date(f as unknown as string);
    });
    const oldest = new Date(Math.min(...fechas.map((d) => d.getTime())));
    const dias = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > DIAS_PLAZO_CC) return true;
  }
  return false;
}

export async function getProduccionesCountAnio(agenteId: string, year: number): Promise<number> {
  const ref = collection(getFirebaseDb(), "producciones");
  const q = query(ref, where("agenteId", "==", agenteId));
  const snap = await getDocs(q);
  return snap.docs.filter((d) => {
    const data = d.data();
    const fecha = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt ?? 0);
    return fecha.getFullYear() === year;
  }).length;
}

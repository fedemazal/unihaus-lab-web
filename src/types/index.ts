// ============================================
// UNIHAUS LAB - TIPOS
// ============================================

export type UserRole = "admin" | "agente";
export type UserStatus = "pendiente" | "aprobado" | "rechazado";
export type PropertyType = "departamento" | "casa";
export type PropertyOccupation = "vacia" | "ocupada";
export type OccupationType = "propietario" | "inquilino";
export type ProductionStatus = "pendiente" | "en_proceso" | "listo" | "cancelado";

export interface UserProfile {
  uid: string;
  email: string;
  nombre: string;
  telefono: string;
  rol: UserRole;
  estado: UserStatus;
  inmobiliariaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inmobiliaria {
  id: string;
  nombre: string;
  descuento: number;
  beneficios: string;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionServices {
  soloFotos: boolean;
  videoAdicional: boolean;
  plano2d: boolean;
  tour360: boolean;
  drone: boolean;
  amoblamiento: boolean;
  cantidadFotosAmobladas: number;
}

export interface PropertyState {
  ocupacion: PropertyOccupation;
  tipo: OccupationType | null;
}

export interface ConfirmedSchedule {
  fecha: string;
  horario: string;
  googleCalendarEventId: string | null;
}

export interface ProductionFiles {
  fotosVideosZip: string | null;
  planoImagen: string | null;
}

export interface PriceBreakdownItem {
  concepto: string;
  calculo: string;
  detalle?: string;
  monto: number;
}

export interface Production {
  id: string;
  agenteId: string;
  agenteNombre: string;
  inmobiliariaId: string;
  inmobiliariaNombre: string;
  tipoPropiedad: PropertyType;
  direccion: string;
  superficie?: number;
  construida?: number;
  descubierta?: number;
  amenidades: number;
  estadoPropiedad: PropertyState;
  servicios: ProductionServices;
  horariosSugeridos: string[];
  observaciones: string;
  horarioConfirmado: ConfirmedSchedule | null;
  precioBase: number;
  precioExtras: number;
  subtotal: number;
  descuentoAplicado: number;
  precioFinal: number;
  desglose: PriceBreakdownItem[];
  estado: ProductionStatus;
  tags: string[];
  archivos: ProductionFiles;
  fechaSolicitud: Date;
  fechaEnProceso: Date | null;
  fechaListo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

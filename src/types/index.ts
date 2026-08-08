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
  bonoBienvenidaUsado?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Capa1Tier {
  min: number;
  max: number | null;
  porcentaje: number;
}

export interface Capa2Benefit {
  producciones: number;
  beneficio: string;
  descripcion: string;
}

export interface BeneficiosConfig {
  capa1: Capa1Tier[];
  capa2: Capa2Benefit[];
  capa3: { porcentaje: number; minServicios: number };
  bonoBienvenida: number;
  prepago: { cantidad: number; descuento: number };
  beneficiosChicos: string[];
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

export type EntregaStatus = "sin_entrega" | "activa" | "archivada";

export interface ArchivoR2 {
  nombre: string;
  key: string;
  contentType: string;
  size: number;
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
  descuentoPaquete?: number;
  codigoDescuento?: string;
  descuentoCodigo?: number;
  precioFinal: number;
  desglose: PriceBreakdownItem[];
  valorEstimado?: number;
  // Entrega R2 (se populan cuando admin sube los archivos)
  entregaStatus?: EntregaStatus;
  entregaArchivos?: ArchivoR2[];
  entregaUploadedAt?: Date | null;
  entregaExpiresAt?: Date | null;
  pagada?: boolean;

  estado: ProductionStatus;
  tags: string[];
  archivos: ProductionFiles;
  fechaSolicitud: Date;
  fechaEnProceso: Date | null;
  fechaListo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodigoDescuento {
  id: string;
  codigo: string;
  porcentaje: number;
  cantidadTotal: number;
  cantidadUsada: number;
  descripcion: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialPreparacion {
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  tipo: "pdf" | "imagen" | "link";
  orden: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

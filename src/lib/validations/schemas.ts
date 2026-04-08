import { z } from 'zod'

export const ticketItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().nonnegative(),
  descuento: z.number().nonnegative().default(0),
})

export const crearTicketSchema = z.object({
  cliente_id: z.string().uuid('Selecciona un cliente'),
  almacen_id: z.string().uuid().optional(),
  items: z.array(ticketItemSchema).min(1, 'Agrega al menos un producto'),
  notas: z.string().max(500).optional(),
})

export const aprobarTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  accion: z.enum(['aprobar', 'rechazar', 'devolver']),
  motivo: z.string().optional(),
})

export const productoSchema = z.object({
  sku: z.string().min(1).max(50),
  nombre: z.string().min(1).max(200),
  descripcion: z.string().max(1000).optional(),
  categoria: z.string().max(100).optional(),
  unidad_medida: z.string().default('PZA'),
  peso_kg: z.number().nonnegative().default(0),
  precio_base: z.number().nonnegative(),
  costo: z.number().nonnegative().default(0),
  tasa_iva: z.number().min(0).max(1).default(0.16),
  tasa_ieps: z.number().min(0).max(1).default(0),
  requiere_caducidad: z.boolean().default(false),
  codigo_barras: z.string().optional(),
})

export const clienteSchema = z.object({
  nombre: z.string().min(1).max(200),
  razon_social: z.string().max(200).optional(),
  rfc: z.string().max(13).optional(),
  regimen_fiscal: z.string().optional(),
  codigo_postal: z.string().length(5).optional(),
  uso_cfdi: z.string().default('G03'),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  credito_habilitado: z.boolean().default(false),
  limite_credito: z.number().nonnegative().default(0),
})

export const recepcionItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad_esperada: z.number().positive().optional(),
  cantidad_recibida: z.number().positive('La cantidad debe ser mayor a 0'),
  fecha_caducidad: z.string().optional(),
  discrepancia: z.string().max(500).optional(),
})

export const crearRecepcionSchema = z.object({
  proveedor_id: z.string().uuid().optional(),
  almacen_id: z.string().uuid('Selecciona un almacén'),
  fecha: z.string().optional(),
  notas: z.string().max(500).optional(),
  items: z.array(recepcionItemSchema).min(1, 'Agrega al menos un producto'),
})

export const ajusteInventarioSchema = z.object({
  inventario_id: z.string().uuid().optional(),
  producto_id: z.string().uuid(),
  almacen_id: z.string().uuid(),
  tipo: z.enum(['entrada', 'salida', 'ajuste', 'merma']),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  notas: z.string().max(500).optional(),
})

export const almacenSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  ubicacion: z.string().max(200).optional(),
  tipo: z.enum(['bodega', 'sucursal']),
})

export const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  razon_social: z.string().max(200).optional(),
  rfc: z.string().max(13).optional(),
  contacto: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

export type CrearTicketInput = z.infer<typeof crearTicketSchema>
export type ProductoInput = z.infer<typeof productoSchema>
export type ClienteInput = z.infer<typeof clienteSchema>
export type CrearRecepcionInput = z.infer<typeof crearRecepcionSchema>
export type AjusteInventarioInput = z.infer<typeof ajusteInventarioSchema>
export type AlmacenInput = z.infer<typeof almacenSchema>
export type ProveedorInput = z.infer<typeof proveedorSchema>

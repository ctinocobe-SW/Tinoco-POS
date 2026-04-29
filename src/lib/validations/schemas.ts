import { z } from 'zod'

export const UNIDADES_VENTA = ['pza', 'kg', 'caja', 'bulto'] as const
export type UnidadVenta = typeof UNIDADES_VENTA[number]

export const ticketItemSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number().nonnegative(),
  descuento: z.number().nonnegative().default(0),
  unidad: z.enum(UNIDADES_VENTA).optional(),
})

export const crearTicketSchema = z.object({
  cliente_id: z.string().uuid('Selecciona un cliente'),
  despachador_id: z.string().uuid().optional(), // admin puede especificar
  almacen_id: z.string().uuid().optional(),
  items: z.array(ticketItemSchema).min(1, 'Agrega al menos un producto'),
  notas: z.string().max(500).optional(),
})

export const aprobarTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  accion: z.enum(['aprobar', 'rechazar', 'devolver']),
  motivo: z.string().optional(),
})

export const CATEGORIAS_PRODUCTO = [
  'Chiles', 'Pastas', 'Croquetas', 'Semillas', 'Enlatados',
  'Medicina', 'Bebidas', 'Botanas', 'Gomitas', 'Molidos', 'Abarrotes', 'Otros',
] as const

export const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  descripcion: z.string().max(1000).optional(),
  categoria: z.enum(CATEGORIAS_PRODUCTO).default('Otros'),
  precio_base: z.preprocess((v) => { const n = Number(v); return isNaN(n) ? 0 : n }, z.number().nonnegative('El precio menudeo no puede ser negativo').default(0)),
  precio_mayoreo: z.preprocess((v) => { const n = Number(v); return isNaN(n) ? 0 : n }, z.number().nonnegative('El precio mayoreo no puede ser negativo').default(0)),
  costo: z.preprocess((v) => { const n = Number(v); return isNaN(n) ? 0 : n }, z.number().nonnegative().default(0)),
  tasa_iva: z.number().min(0).max(1).default(0.16),
  tasa_ieps: z.number().min(0).max(1).default(0),
  peso_kg: z.number().nonnegative().default(0),
  vende_pza: z.boolean().default(false),
  vende_kg: z.boolean().default(false),
  vende_caja: z.boolean().default(false),
  vende_bulto: z.boolean().default(false),
  piezas_por_caja: z.number().positive().optional(),
  piezas_por_bulto: z.number().positive().optional(),
  unidad_precio_base: z.preprocess((v) => (v == null || v === '' ? undefined : v), z.enum(['pza', 'kg']).optional()),
  unidad_precio_mayoreo: z.preprocess((v) => (v == null || v === '' ? undefined : v), z.enum(UNIDADES_VENTA).optional()),
  unidad_inventario_principal: z.enum(UNIDADES_VENTA).default('pza'),
  proveedor_whatsapp: z.string().max(20).optional().or(z.literal('')),
  requiere_caducidad: z.boolean().default(false),
  fecha_caducidad: z.string().optional(),
  codigo_barras: z.string().optional(),
  stock_inicial: z.number().nonnegative().default(0).optional(),
  almacen_id_inicial: z.preprocess((v) => (v == null || v === '' ? undefined : v), z.string().uuid().optional()),
})

export const clienteSchema = z.object({
  nombre: z.string().min(1).max(200),
  razon_social: z.string().max(200).optional(),
  rfc: z.string().max(13).optional().or(z.literal('')),
  regimen_fiscal: z.string().optional().or(z.literal('')),
  codigo_postal: z.string().optional().or(z.literal('')).refine(
    (v) => !v || v.length === 5,
    { message: 'El código postal debe tener 5 dígitos' },
  ),
  uso_cfdi: z.string().optional().or(z.literal('')),
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
  zona_id: z.string().uuid().optional(),
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

export const preferenciasSurtidoSchema = z.object({
  top_n: z.number().int().min(1).max(200).default(20),
  incluir_bajo_minimo: z.boolean().default(true),
  almacen_destino_default: z.string().uuid().optional(),
  solo_controla_inventario: z.boolean().default(true),
})

export const generarBorradorSurtidoSchema = z.object({
  almacen_destino_id: z.string().uuid('Selecciona el almacén destino'),
  top_n: z.number().int().min(1).max(200).optional(),
  incluir_bajo_minimo: z.boolean().optional(),
  solo_controla_inventario: z.boolean().optional(),
})

export const crearListaSurtidoSchema = z.object({
  almacen_destino_id: z.string().uuid(),
  notas: z.string().max(500).optional(),
  items: z.array(z.object({
    producto_id: z.string().uuid(),
    cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
    almacen_origen_item_id: z.string().uuid().optional(),
  })).min(1, 'Agrega al menos un producto'),
})

export type PreferenciasSurtidoInput = z.infer<typeof preferenciasSurtidoSchema>
export type GenerarBorradorSurtidoInput = z.infer<typeof generarBorradorSurtidoSchema>
export type CrearListaSurtidoInput = z.infer<typeof crearListaSurtidoSchema>

export type CrearTicketInput = z.infer<typeof crearTicketSchema>
export type ProductoInput = z.infer<typeof productoSchema>
export type CategoriaProducto = typeof CATEGORIAS_PRODUCTO[number]
export type ClienteInput = z.infer<typeof clienteSchema>
export type CrearRecepcionInput = z.infer<typeof crearRecepcionSchema>
export type AjusteInventarioInput = z.infer<typeof ajusteInventarioSchema>
export type AlmacenInput = z.infer<typeof almacenSchema>
export type ProveedorInput = z.infer<typeof proveedorSchema>

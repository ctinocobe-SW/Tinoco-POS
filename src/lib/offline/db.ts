import Dexie, { type Table } from 'dexie'

// Tipos locales para modo offline
export interface OfflineTicket {
  id: string
  folio_local: string
  cliente_id: string
  cliente_nombre: string
  items: OfflineTicketItem[]
  notas?: string
  created_at: string
  sincronizado: boolean
}

export interface OfflineTicketItem {
  producto_id: string
  sku: string
  nombre: string
  cantidad: number
  precio_unitario: number
}

export interface SyncEvent {
  id?: number
  tipo: 'create_ticket' | 'update_ticket' | 'create_recepcion' | 'update_inventario'
  payload: object
  created_at: string
  intentos: number
  error?: string
}

export interface CachedProducto {
  id: string
  sku: string
  nombre: string
  categoria?: string
  unidad_medida: string
  peso_kg: number
  precio_base: number
  tasa_iva: number
  tasa_ieps: number
  codigo_barras?: string
  cached_at: string
}

export interface CachedCliente {
  id: string
  nombre: string
  razon_social?: string
  rfc?: string
  whatsapp?: string
  cached_at: string
}

class POSDatabase extends Dexie {
  tickets!: Table<OfflineTicket>
  syncQueue!: Table<SyncEvent>
  productos!: Table<CachedProducto>
  clientes!: Table<CachedCliente>

  constructor() {
    super('pos-tinoco-offline')

    this.version(1).stores({
      tickets: 'id, folio_local, sincronizado, created_at',
      syncQueue: '++id, tipo, created_at',
      productos: 'id, sku, codigo_barras, cached_at',
      clientes: 'id, nombre, rfc, cached_at',
    })
  }
}

export const offlineDB = new POSDatabase()

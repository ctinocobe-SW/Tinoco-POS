// Este archivo se regenera automáticamente con:
// npm run db:generate
// No editar manualmente.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'despachador' | 'checador'
export type TicketEstado =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'aprobado'
  | 'rechazado'
  | 'devuelto'
  | 'en_verificacion'
  | 'verificado'
  | 'con_incidencias'
  | 'despachado'
  | 'facturado'
  | 'cerrado'
export type MovimientoTipo = 'entrada' | 'salida' | 'traspaso' | 'merma' | 'ajuste'
export type DiscrepanciaTipo = 'faltante' | 'sobrante' | 'incorrecto' | 'danado'
export type AlmacenTipo = 'bodega' | 'sucursal'
export type ListaSurtidoEstado = 'borrador' | 'confirmada' | 'en_transito' | 'entregada' | 'cancelada'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nombre: string
          email: string
          rol: UserRole
          almacen_id: string | null
          activo: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      tickets: {
        Row: {
          id: string
          folio: string
          cliente_id: string
          despachador_id: string
          checador_id: string | null
          almacen_id: string | null
          estado: TicketEstado
          subtotal: number
          iva: number
          ieps: number
          descuento: number
          total: number
          notas: string | null
          motivo_rechazo: string | null
          aprobado_por: string | null
          aprobado_at: string | null
          verificado_at: string | null
          despachado_at: string | null
          facturado: boolean
          cfdi_uuid: string | null
          cfdi_folio: string | null
          whatsapp_enviado: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tickets']['Row'], 'folio' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      productos: {
        Row: {
          id: string
          sku: string
          nombre: string
          descripcion: string | null
          categoria: string | null
          unidad_medida: string
          peso_kg: number
          precio_base: number
          costo: number
          tasa_iva: number
          tasa_ieps: number
          requiere_caducidad: boolean
          codigo_barras: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['productos']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['productos']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
      ticket_estado: TicketEstado
      movimiento_tipo: MovimientoTipo
      discrepancia_tipo: DiscrepanciaTipo
      almacen_tipo: AlmacenTipo
      lista_surtido_estado: ListaSurtidoEstado
    }
  }
}

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

export type UserRole = 'admin' | 'despachador' | 'checador' | 'cajero'
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
  | 'cancelado'
export type MovimientoTipo = 'entrada' | 'salida' | 'traspaso' | 'merma' | 'ajuste'
export type DiscrepanciaTipo = 'faltante' | 'sobrante' | 'incorrecto' | 'danado'
export type AlmacenTipo = 'bodega' | 'sucursal'
export type ListaSurtidoEstado = 'borrador' | 'confirmada' | 'en_transito' | 'entregada' | 'cancelada'
export type CreditoEstado = 'vigente' | 'vencido' | 'liquidado' | 'cancelado'
export type MetodoPagoCredito = 'efectivo' | 'transferencia' | 'cheque' | 'otro'
export type FacturaEstado = 'pendiente' | 'timbrada' | 'cancelada' | 'error'
export type WhatsappMensajeTipo = 'text' | 'image' | 'audio' | 'document' | 'location' | 'interactive'
export type WhatsappMensajeEstado = 'nuevo' | 'procesando' | 'ticket_creado' | 'ignorado' | 'error'
export type ListaAlmacenEstado = 'borrador' | 'finalizada'
export type TraspasoEstado = 'pendiente' | 'en_transito' | 'recibido' | 'cancelado'

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
      creditos: {
        Row: {
          id: string
          cliente_id: string
          ticket_id: string | null
          monto_original: number
          saldo: number
          fecha_otorgamiento: string
          fecha_vencimiento: string
          plazo_dias: number
          tasa_mora_pct: number
          estado: CreditoEstado
          aval_nombre: string | null
          lugar_expedicion: string
          notas: string | null
          otorgado_por: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['creditos']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['creditos']['Insert']>
      }
      abonos_credito: {
        Row: {
          id: string
          credito_id: string
          monto: number
          fecha: string
          metodo_pago: MetodoPagoCredito
          referencia: string | null
          notas: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['abonos_credito']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['abonos_credito']['Insert']>
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
          cobro_pendiente: boolean
          es_credito: boolean
          credito_id: string | null
          tiempo_despacho_segundos: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tickets']['Row'], 'folio' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          razon_social: string | null
          rfc: string | null
          regimen_fiscal: string | null
          codigo_postal: string | null
          uso_cfdi: string
          telefono: string | null
          email: string | null
          whatsapp: string | null
          credito_habilitado: boolean
          limite_credito: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clientes']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>
      }
      ticket_items: {
        Row: {
          id: string
          ticket_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          descuento: number
          subtotal: number
          verificado: boolean
          discrepancia_tipo: DiscrepanciaTipo | null
          discrepancia_nota: string | null
          foto_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ticket_items']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['ticket_items']['Insert']>
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
          volumen_m3: number
          precio_base: number
          precio_mayoreo: number
          costo: number
          vende_pza: boolean
          vende_kg: boolean
          vende_caja: boolean
          vende_bulto: boolean
          piezas_por_caja: number | null
          piezas_por_bulto: number | null
          tasa_iva: number
          tasa_ieps: number
          requiere_caducidad: boolean
          fecha_caducidad: string | null
          codigo_barras: string | null
          lleva_inventario: boolean
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['productos']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['productos']['Insert']>
      }
      almacenes: {
        Row: {
          id: string
          nombre: string
          ubicacion: string | null
          tipo: AlmacenTipo
          responsable_id: string | null
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['almacenes']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['almacenes']['Insert']>
      }
      proveedores: {
        Row: {
          id: string
          nombre: string
          razon_social: string | null
          rfc: string | null
          contacto: string | null
          telefono: string | null
          email: string | null
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['proveedores']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['proveedores']['Insert']>
      }
      recepciones: {
        Row: {
          id: string
          proveedor_id: string | null
          despachador_id: string
          almacen_id: string
          fecha: string
          notas: string | null
          confirmado: boolean
          confirmado_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recepciones']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['recepciones']['Insert']>
      }
      recepcion_items: {
        Row: {
          id: string
          recepcion_id: string
          producto_id: string
          cantidad_esperada: number | null
          cantidad_recibida: number
          fecha_caducidad: string | null
          discrepancia: string | null
          zona_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recepcion_items']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['recepcion_items']['Insert']>
      }
      inventario: {
        Row: {
          id: string
          producto_id: string
          almacen_id: string
          stock_actual: number
          stock_minimo: number
          stock_maximo: number | null
          ubicacion_fisica: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventario']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['inventario']['Insert']>
      }
      movimientos_inventario: {
        Row: {
          id: string
          producto_id: string
          almacen_id: string
          tipo: MovimientoTipo
          cantidad: number
          referencia_tipo: string | null
          referencia_id: string | null
          usuario_id: string | null
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimientos_inventario']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['movimientos_inventario']['Insert']>
      }
      configuracion_fiscal: {
        Row: {
          id: string
          rfc: string
          razon_social: string
          regimen_fiscal: string
          codigo_postal: string
          lugar_expedicion: string
          pac_nombre: string | null
          pac_usuario: string | null
          pac_password_enc: string | null
          pac_ambiente: string
          serie: string
          folio_actual: number
          logo_url: string | null
          domicilio: string | null
          telefono: string | null
          email_envio: string | null
          activo: boolean
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['configuracion_fiscal']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['configuracion_fiscal']['Insert']>
      }
      facturas: {
        Row: {
          id: string
          ticket_id: string | null
          cliente_id: string
          folio_fiscal: string | null
          serie: string
          folio: number | null
          fecha_emision: string | null
          fecha_timbrado: string | null
          rfc_receptor: string
          razon_social_receptor: string
          uso_cfdi: string
          regimen_fiscal_receptor: string
          codigo_postal_receptor: string | null
          subtotal: number
          descuento: number
          iva: number
          ieps: number
          total: number
          estado: FacturaEstado
          error_mensaje: string | null
          xml_url: string | null
          pdf_url: string | null
          cadena_original: string | null
          sello_cfd: string | null
          sello_sat: string | null
          pac_respuesta: Record<string, unknown> | null
          cancelada_at: string | null
          motivo_cancelacion: string | null
          emitida_por: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['facturas']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['facturas']['Insert']>
      }
      whatsapp_mensajes: {
        Row: {
          id: string
          from_number: string
          display_name: string | null
          body: string | null
          tipo: WhatsappMensajeTipo
          media_url: string | null
          wa_message_id: string | null
          wa_timestamp: string | null
          payload_raw: Record<string, unknown> | null
          estado: WhatsappMensajeEstado
          ticket_id: string | null
          cliente_id: string | null
          notas_procesado: string | null
          procesado_por: string | null
          procesado_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['whatsapp_mensajes']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['whatsapp_mensajes']['Insert']>
      }
      vehiculos: {
        Row: {
          id: string
          nombre: string
          placa: string | null
          capacidad_kg: number
          capacidad_m3: number | null
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehiculos']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['vehiculos']['Insert']>
      }
      listas_surtido: {
        Row: {
          id: string
          almacen_destino_id: string
          almacen_origen_id: string | null
          creado_por: string
          estado: ListaSurtidoEstado
          peso_total_kg: number
          vehiculo_id: string | null
          numero_viajes: number
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['listas_surtido']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['listas_surtido']['Insert']>
      }
      lista_surtido_items: {
        Row: {
          id: string
          lista_id: string
          producto_id: string
          cantidad: number
          peso_parcial_kg: number
          viaje_numero: number
          entregado: boolean
          entregado_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lista_surtido_items']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['lista_surtido_items']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          usuario_id: string | null
          accion: string
          entidad: string
          entidad_id: string | null
          datos_antes: Record<string, unknown> | null
          datos_despues: Record<string, unknown> | null
          ip: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      listas_almacen: {
        Row: {
          id: string
          nombre: string
          notas: string | null
          estado: ListaAlmacenEstado
          creado_por: string | null
          almacen_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['listas_almacen']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['listas_almacen']['Insert']>
      }
      lista_almacen_items: {
        Row: {
          id: string
          lista_id: string
          producto_id: string
          cantidad: number
          notas: string | null
          checado: boolean
          checado_at: string | null
          checado_por: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lista_almacen_items']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['lista_almacen_items']['Insert']>
      }
      producto_proveedor: {
        Row: {
          producto_id: string
          proveedor_id: string
          created_at: string
        }
        Insert: Database['public']['Tables']['producto_proveedor']['Row']
        Update: Partial<Database['public']['Tables']['producto_proveedor']['Row']>
      }
      zonas: {
        Row: {
          id: string
          nombre: string
          almacen_id: string
          despachador_id: string | null
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['zonas']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['zonas']['Insert']>
      }
      traspasos: {
        Row: {
          id: string
          folio: string
          almacen_origen_id: string
          almacen_destino_id: string
          estado: string
          solicitado_por: string | null
          recibido_por: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['traspasos']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['traspasos']['Insert']>
      }
      traspaso_items: {
        Row: {
          id: string
          traspaso_id: string
          producto_id: string
          cantidad_solicitada: number
          cantidad_recibida: number | null
          notas: string | null
        }
        Insert: Database['public']['Tables']['traspaso_items']['Row']
        Update: Partial<Database['public']['Tables']['traspaso_items']['Row']>
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
      credito_estado: CreditoEstado
      metodo_pago_credito: MetodoPagoCredito
      factura_estado: FacturaEstado
      whatsapp_mensaje_tipo: WhatsappMensajeTipo
      whatsapp_mensaje_estado: WhatsappMensajeEstado
    }
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { almacenSchema, proveedorSchema } from '@/lib/validations/schemas'
import type { AlmacenInput, ProveedorInput } from '@/lib/validations/schemas'

// ── Almacenes ──────────────────────────────────────────────

export async function crearAlmacen(input: AlmacenInput) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const parsed = almacenSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { nombre, ubicacion, tipo } = parsed.data

  const { data, error } = await supabase
    .from('almacenes')
    .insert({ id: crypto.randomUUID(), nombre, ubicacion: ubicacion ?? null, tipo, activo: true })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  revalidatePath('/despachador/recepciones/nueva')
  return { data: { id: (data as any).id } }
}

export async function actualizarAlmacen(almacenId: string, input: AlmacenInput) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const parsed = almacenSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { nombre, ubicacion, tipo } = parsed.data

  const { error } = await supabase
    .from('almacenes')
    .update({ nombre, ubicacion: ubicacion ?? null, tipo })
    .eq('id', almacenId)

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  return { data: { ok: true } }
}

export async function toggleAlmacen(almacenId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const { data: almacen } = await supabase
    .from('almacenes')
    .select('activo')
    .eq('id', almacenId)
    .single()

  if (!almacen) return { error: 'Almacén no encontrado' }

  const { error } = await supabase
    .from('almacenes')
    .update({ activo: !(almacen as any).activo })
    .eq('id', almacenId)

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  return { data: { activo: !(almacen as any).activo } }
}

// ── Proveedores ────────────────────────────────────────────

export async function crearProveedor(input: ProveedorInput) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const parsed = proveedorSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { nombre, razon_social, rfc, contacto, telefono, email } = parsed.data

  const { data, error } = await supabase
    .from('proveedores')
    .insert({
      id: crypto.randomUUID(),
      nombre,
      razon_social: razon_social ?? null,
      rfc: rfc ?? null,
      contacto: contacto ?? null,
      telefono: telefono ?? null,
      email: email || null,
      activo: true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  return { data: { id: (data as any).id } }
}

export async function actualizarProveedor(proveedorId: string, input: ProveedorInput) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const parsed = proveedorSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { nombre, razon_social, rfc, contacto, telefono, email } = parsed.data

  const { error } = await supabase
    .from('proveedores')
    .update({
      nombre,
      razon_social: razon_social ?? null,
      rfc: rfc ?? null,
      contacto: contacto ?? null,
      telefono: telefono ?? null,
      email: email || null,
    })
    .eq('id', proveedorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  return { data: { ok: true } }
}

export async function setProductosProveedor(proveedorId: string, productoIds: string[]) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const { error: delError } = await supabase
    .from('producto_proveedor')
    .delete()
    .eq('proveedor_id', proveedorId)

  if (delError) return { error: delError.message }

  if (productoIds.length > 0) {
    const { error } = await supabase
      .from('producto_proveedor')
      .insert(productoIds.map((pid) => ({ producto_id: pid, proveedor_id: proveedorId })))
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/productos')
  return { data: { ok: true } }
}

export async function setProveedoresProducto(productoId: string, proveedorIds: string[]) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const { error: delError } = await supabase
    .from('producto_proveedor')
    .delete()
    .eq('producto_id', productoId)

  if (delError) return { error: delError.message }

  if (proveedorIds.length > 0) {
    const { error } = await supabase
      .from('producto_proveedor')
      .insert(proveedorIds.map((vid) => ({ producto_id: productoId, proveedor_id: vid })))
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/configuracion')
  revalidatePath('/admin/productos')
  return { data: { ok: true } }
}

export async function toggleProveedor(proveedorId: string) {
  const { profile, supabase } = await getAuthenticatedProfile()
  if (profile.rol !== 'admin') return { error: 'Sin permisos' }

  const { data: prov } = await supabase
    .from('proveedores')
    .select('activo')
    .eq('id', proveedorId)
    .single()

  if (!prov) return { error: 'Proveedor no encontrado' }

  const { error } = await supabase
    .from('proveedores')
    .update({ activo: !(prov as any).activo })
    .eq('id', proveedorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/configuracion')
  return { data: { activo: !(prov as any).activo } }
}

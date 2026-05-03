'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedProfile } from './helpers'
import { preferenciasSurtidoSchema, type PreferenciasSurtidoInput } from '@/lib/validations/schemas'

export async function getPreferenciasSurtido() {
  const { profile, supabase } = await getAuthenticatedProfile()

  const { data, error } = await supabase
    .from('preferencias_surtido')
    .select('top_n, incluir_bajo_minimo, almacen_destino_default, solo_controla_inventario')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (error) return { error: error.message }

  return {
    data: data ?? {
      top_n: 20,
      incluir_bajo_minimo: true,
      almacen_destino_default: null,
      solo_controla_inventario: true,
    },
  }
}

export async function upsertPreferenciasSurtido(input: PreferenciasSurtidoInput) {
  const { profile, supabase } = await getAuthenticatedProfile()

  const parsed = preferenciasSurtidoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('preferencias_surtido')
    .upsert({
      user_id: profile.id,
      top_n: parsed.data.top_n,
      incluir_bajo_minimo: parsed.data.incluir_bajo_minimo,
      almacen_destino_default: parsed.data.almacen_destino_default ?? null,
      solo_controla_inventario: parsed.data.solo_controla_inventario,
      updated_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }

  revalidatePath('/despachador/surtido')
  revalidatePath('/admin/surtido')
  return { data: { ok: true } }
}

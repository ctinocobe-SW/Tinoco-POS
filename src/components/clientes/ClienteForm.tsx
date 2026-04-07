'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { clienteSchema } from '@/lib/validations/schemas'
import type { ClienteInput } from '@/lib/validations/schemas'
import { crearCliente, actualizarCliente } from '@/lib/actions/clientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface ClienteFormProps {
  clienteId?: string
  defaultValues?: Partial<ClienteInput>
}

const USOS_CFDI = [
  { value: 'G01', label: 'G01 - Adquisición de mercancias' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I04', label: 'I04 - Equipo de cómputo y accesorios' },
  { value: 'P01', label: 'P01 - Por definir' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' },
]

const REGIMENES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '625', label: '625 - Régimen de las Actividades Empresariales' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' },
]

export function ClienteForm({ clienteId, defaultValues }: ClienteFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!clienteId

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: '',
      razon_social: '',
      rfc: '',
      regimen_fiscal: '626',
      codigo_postal: '',
      uso_cfdi: 'G03',
      telefono: '',
      email: '',
      whatsapp: '',
      credito_habilitado: false,
      limite_credito: 0,
      ...defaultValues,
    },
  })

  const creditoHabilitado = watch('credito_habilitado')

  const onSubmit = async (data: ClienteInput) => {
    setSubmitting(true)
    try {
      const result = isEdit
        ? await actualizarCliente(clienteId, data)
        : await crearCliente(data)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado correctamente')
      router.push('/admin/clientes')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Datos generales */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Datos generales</h2>

        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre comercial *</Label>
          <Input
            id="nombre"
            {...register('nombre')}
            placeholder="Nombre del cliente"
          />
          {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="razon_social">Razón social</Label>
          <Input
            id="razon_social"
            {...register('razon_social')}
            placeholder="Razón Social S.A. de C.V."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              {...register('telefono')}
              placeholder="461-000-0000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              {...register('whatsapp')}
              placeholder="4610000000"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="contacto@cliente.com"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>

      {/* Datos fiscales */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Datos fiscales</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              {...register('rfc')}
              placeholder="XAXX010101000"
              className="font-mono"
            />
            {errors.rfc && <p className="text-xs text-red-600">{errors.rfc.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="codigo_postal">Código postal</Label>
            <Input
              id="codigo_postal"
              {...register('codigo_postal')}
              placeholder="36000"
              maxLength={5}
            />
            {errors.codigo_postal && <p className="text-xs text-red-600">{errors.codigo_postal.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="regimen_fiscal">Régimen fiscal</Label>
          <Select id="regimen_fiscal" {...register('regimen_fiscal')}>
            {REGIMENES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="uso_cfdi">Uso de CFDI</Label>
          <Select id="uso_cfdi" {...register('uso_cfdi')}>
            {USOS_CFDI.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Crédito */}
      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium">Crédito</h2>

        <div className="flex items-center gap-3">
          <input
            id="credito_habilitado"
            type="checkbox"
            {...register('credito_habilitado')}
            className="w-4 h-4 accent-brand-accent"
          />
          <Label htmlFor="credito_habilitado" className="normal-case text-sm text-foreground">
            Habilitar crédito para este cliente
          </Label>
        </div>

        {creditoHabilitado && (
          <div className="space-y-1.5">
            <Label htmlFor="limite_credito">Límite de crédito (MXN)</Label>
            <Input
              id="limite_credito"
              type="number"
              step="0.01"
              min="0"
              {...register('limite_credito', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/clientes')}
          disabled={submitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

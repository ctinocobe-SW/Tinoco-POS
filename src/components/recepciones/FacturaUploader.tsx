'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subirFacturaProveedor, obtenerUrlFactura } from '@/lib/actions/recepciones'

interface FacturaUploaderProps {
  recepcionId: string
  facturaUrl: string | null
  disabled?: boolean
}

export function FacturaUploader({ recepcionId, facturaUrl, disabled }: FacturaUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [openingUrl, setOpeningUrl] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('recepcion_id', recepcionId)
    fd.append('file', file)
    startTransition(async () => {
      const result = await subirFacturaProveedor(fd)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Factura subida')
      router.refresh()
    })
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleAbrir = async () => {
    if (!facturaUrl) return
    setOpeningUrl(true)
    try {
      const result = await obtenerUrlFactura(facturaUrl)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      window.open((result as any).data.url, '_blank', 'noopener')
    } finally {
      setOpeningUrl(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || pending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || pending}
        >
          <Upload size={14} className="mr-1.5" />
          {pending ? 'Subiendo...' : facturaUrl ? 'Reemplazar factura' : 'Subir factura'}
        </Button>

        {facturaUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAbrir}
            disabled={openingUrl}
          >
            <FileText size={14} className="mr-1.5" />
            Ver factura
            <ExternalLink size={12} className="ml-1" />
          </Button>
        )}
      </div>
      {!facturaUrl && (
        <p className="text-xs text-muted-foreground">
          PDF o imagen (PNG/JPG/WEBP), máximo 10 MB.
        </p>
      )}
    </div>
  )
}

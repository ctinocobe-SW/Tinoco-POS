'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportarProductosDialog } from './ImportarProductosDialog'

export function ImportarButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} className="mr-1.5" />
        Importar
      </Button>
      <ImportarProductosDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

import { formatMXN } from '@/lib/utils/format'

interface TicketItem {
  id: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
  verificado?: boolean
  discrepancia_tipo?: string | null
  producto_nombre?: string
  producto_sku?: string
}

interface TicketItemsTableProps {
  items: TicketItem[]
  showVerificacion?: boolean
}

export function TicketItemsTable({ items, showVerificacion = false }: TicketItemsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 font-medium">SKU</th>
            <th className="pb-2 font-medium">Producto</th>
            <th className="pb-2 font-medium text-right">Cant.</th>
            <th className="pb-2 font-medium text-right">Precio</th>
            <th className="pb-2 font-medium text-right">Desc.</th>
            <th className="pb-2 font-medium text-right">Subtotal</th>
            {showVerificacion && <th className="pb-2 font-medium text-center">Estado</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">{item.producto_sku ?? '—'}</td>
              <td className="py-2">{item.producto_nombre ?? '—'}</td>
              <td className="py-2 text-right">{Number(item.cantidad)}</td>
              <td className="py-2 text-right">{formatMXN(Number(item.precio_unitario))}</td>
              <td className="py-2 text-right">{formatMXN(Number(item.descuento))}</td>
              <td className="py-2 text-right font-medium">{formatMXN(Number(item.subtotal))}</td>
              {showVerificacion && (
                <td className="py-2 text-center">
                  {item.verificado ? (
                    <span className="text-emerald-600">Verificado</span>
                  ) : item.discrepancia_tipo ? (
                    <span className="text-red-600">{item.discrepancia_tipo}</span>
                  ) : (
                    <span className="text-muted-foreground">Pendiente</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

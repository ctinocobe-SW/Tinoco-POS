'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface TopProducto {
  nombre: string
  sku: string
  cantidad: number
  total: number
}

interface TopProductosChartProps {
  data: TopProducto[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TopProducto
  return (
    <div className="bg-white border border-border rounded-md shadow-sm px-3 py-2 text-sm">
      <p className="font-medium">{d.nombre}</p>
      <p className="text-xs text-muted-foreground font-mono mb-1">{d.sku}</p>
      <p className="text-muted-foreground">
        Unidades: <span className="font-medium text-foreground">{d.cantidad.toLocaleString('es-MX')}</span>
      </p>
      <p className="text-muted-foreground">
        Ventas: <span className="font-medium text-foreground">
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(d.total)}
        </span>
      </p>
    </div>
  )
}

export function TopProductosChart({ data }: TopProductosChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos de ventas
      </div>
    )
  }

  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + '…' : s

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={{ fontSize: 11, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
          width={130}
          tickFormatter={(v) => truncate(v, 18)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey="cantidad" radius={[0, 3, 3, 0]} maxBarSize={20}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#0a0a0a' : i === 1 ? '#374151' : '#9ca3af'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

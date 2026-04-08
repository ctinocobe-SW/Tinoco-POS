'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DatoVenta {
  fecha: string  // 'DD/MMM'
  total: number
  tickets: number
}

interface VentasPorDiaChartProps {
  data: DatoVenta[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-md shadow-sm px-3 py-2 text-sm">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-muted-foreground">
        Tickets: <span className="font-medium text-foreground">{payload[0]?.payload?.tickets}</span>
      </p>
      <p className="text-muted-foreground">
        Total: <span className="font-medium text-foreground">
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(payload[0]?.value ?? 0)}
        </span>
      </p>
    </div>
  )
}

export function VentasPorDiaChart({ data }: VentasPorDiaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos en los últimos 30 días
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey="total" fill="#0a0a0a" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}

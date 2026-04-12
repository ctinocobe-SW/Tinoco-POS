const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const CENTENAS = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

function grupo(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'CIEN'
  const c = Math.floor(n / 100)
  const d = n % 100
  const prefix = c > 0 ? CENTENAS[c] + (d > 0 ? ' ' : '') : ''
  if (d === 0) return prefix
  if (d < 20) return prefix + UNIDADES[d]
  const dec = Math.floor(d / 10)
  const uni = d % 10
  return prefix + DECENAS[dec] + (uni > 0 ? ' Y ' + UNIDADES[uni] : '')
}

export function montoALetras(amount: number): string {
  const entero = Math.floor(amount)
  const centavos = Math.round((amount - entero) * 100)

  if (entero === 0) return `CERO PESOS ${centavos.toString().padStart(2, '0')}/100 M.N.`

  const miles = Math.floor(entero / 1000)
  const resto = entero % 1000

  let texto = ''
  if (miles > 0) {
    if (miles === 1) texto = 'MIL '
    else texto = grupo(miles) + ' MIL '
  }
  if (resto > 0) texto += grupo(resto)

  return `${texto.trim()} PESOS ${centavos.toString().padStart(2, '0')}/100 M.N.`
}

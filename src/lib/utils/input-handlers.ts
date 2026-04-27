import type { WheelEvent } from 'react'

/** Evita que un <input type="number"> cambie su valor al hacer scroll con la rueda. */
export const blurOnWheel = (e: WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur()
}

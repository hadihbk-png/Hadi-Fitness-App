import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Ring, compact } from '../../src/components/ui'
import { RouterProvider } from '../../src/lib/router'

const offset = (progress) => {
  const { container } = render(
    <RouterProvider>
      <Ring progress={progress} animate={false} />
    </RouterProvider>
  )
  const el = container.querySelector('.ring-value')
  return { off: Number(el.getAttribute('stroke-dashoffset')), len: Number(el.getAttribute('stroke-dasharray')), raw: el.getAttribute('stroke-dashoffset') }
}

describe('Ring', () => {
  it('never draws more than 100%', () => {
    expect(offset(2.5).off).toBe(0)
  })
  it('never draws below 0% and never renders NaN', () => {
    for (const p of [-1, NaN, undefined, Infinity / Infinity]) {
      const { off, len, raw } = offset(p)
      expect(raw).not.toBe('NaN')
      expect(off).toBeCloseTo(len)
    }
  })
})

describe('compact counter numbers', () => {
  it('keeps hero counters short', () => {
    expect(compact(7)).toEqual({ value: 7, decimals: 0, suffix: '' })
    expect(compact(1500)).toEqual({ value: 1.5, decimals: 1, suffix: 'K' })
    expect(compact(128000)).toEqual({ value: 128, decimals: 0, suffix: 'K' })
    expect(compact(2_400_000)).toEqual({ value: 2.4, decimals: 1, suffix: 'M' })
  })
})

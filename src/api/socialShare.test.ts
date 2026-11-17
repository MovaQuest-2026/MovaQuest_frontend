import { expect, it, vi } from 'vitest'

vi.mock('./http', () => ({ apiFetch: vi.fn() }))

import { apiFetch } from './http'
import { recordShare } from './social'

it('records a share and ignores backend failures', async () => {
  vi.mocked(apiFetch).mockImplementation(async () => {
    throw new Error('network')
  })
  await recordShare('cafe-madrid', 'copy')
  expect(apiFetch).toHaveBeenCalledWith('/lessons/cafe-madrid/share', expect.objectContaining({ method: 'POST' }))
})

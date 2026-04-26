import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readFileAsDataUrlWithRetry } from '../../../ui/src/utils/export/readFileAsDataUrlWithRetry'

describe('readFileAsDataUrlWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries transient decoder failures and eventually returns a data URL', async () => {
    const readFileAsDataUrl = vi.fn()
      .mockRejectedValueOnce(new Error('decoder warming up'))
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('data:image/png;base64,' + 'a'.repeat(256))

    const pending = readFileAsDataUrlWithRetry(readFileAsDataUrl, '/tmp/example.png', {
      attempts: 5,
      minLength: 32,
      delaysMs: [5, 10, 20, 40],
    })

    await vi.runAllTimersAsync()
    await expect(pending).resolves.toContain('data:image/png;base64,')
    expect(readFileAsDataUrl).toHaveBeenCalledTimes(3)
    expect(readFileAsDataUrl).toHaveBeenNthCalledWith(1, { filePath: '/tmp/example.png' })
  })

  it('throws the last error after exhausting attempts', async () => {
    const readFileAsDataUrl = vi.fn(async () => {
      throw new Error('invalid PNG footer')
    })

    const pending = readFileAsDataUrlWithRetry(readFileAsDataUrl, '/tmp/bad.png', {
      attempts: 3,
      delaysMs: [1, 1],
    })
    pending.catch(() => {})

    await vi.runAllTimersAsync()
    await expect(pending).rejects.toThrow('invalid PNG footer')
    expect(readFileAsDataUrl).toHaveBeenCalledTimes(3)
  })

  it('fails fast when the reader is unavailable', async () => {
    await expect(readFileAsDataUrlWithRetry(null, '/tmp/bad.png')).rejects.toThrow('readFileAsDataUrl is unavailable')
  })
})
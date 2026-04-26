const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function readFileAsDataUrlWithRetry(readFileAsDataUrl, filePath, options = {}) {
  if (typeof readFileAsDataUrl !== 'function') {
    throw new Error('readFileAsDataUrl is unavailable')
  }
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('filePath is required')
  }

  const attempts = Math.max(1, Math.floor(Number(options.attempts) || 12))
  const minLength = Math.max(1, Math.floor(Number(options.minLength) || 1))
  const delays = Array.isArray(options.delaysMs) && options.delaysMs.length
    ? options.delaysMs.map((value) => Math.max(0, Math.floor(Number(value) || 0)))
    : [40, 40, 40, 80, 80, 80, 80, 140, 140, 140, 140]

  let lastError = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const dataUrl = await readFileAsDataUrl({ filePath })
      if (typeof dataUrl === 'string' && dataUrl.length >= minLength) {
        return dataUrl
      }
    } catch (error) {
      lastError = error
    }

    if (attempt >= attempts - 1) break
    const delayMs = delays[Math.min(attempt, delays.length - 1)] || 0
    await sleep(delayMs)
  }

  throw lastError || new Error('readFileAsDataUrl failed')
}
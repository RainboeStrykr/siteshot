/**
 * Vercel serverless function: /api/s3-img-proxy
 *
 * Proxies GET requests to S3 so the browser never makes a cross-origin
 * request directly to amazonaws.com (which would taint the canvas and
 * block export). The Vite dev proxy handles the same /api/s3-img/* path
 * during development, so behaviour is identical in both environments.
 *
 * Request path:  /api/s3-img/<s3-path>
 * Proxied to:    https://s3.amazonaws.com/<s3-path>
 */
export default async function handler(req, res) {
  // Extract the S3 path — everything after /api/s3-img
  const prefix = '/api/s3-img'
  const url = new URL(req.url, 'http://localhost')
  const s3Path = url.pathname.startsWith(prefix)
    ? url.pathname.slice(prefix.length)
    : url.pathname

  if (!s3Path || s3Path === '/') {
    res.status(400).send('Missing S3 path')
    return
  }

  const s3Url = `https://s3.amazonaws.com${s3Path}${url.search || ''}`

  try {
    const response = await fetch(s3Url)

    if (!response.ok) {
      res.status(response.status).send(`S3 responded with ${response.status}`)
      return
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    const arrayBuffer = await response.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).send(Buffer.from(arrayBuffer))
  } catch (err) {
    res.status(502).send(`Proxy error: ${err?.message || String(err)}`)
  }
}

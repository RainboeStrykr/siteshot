/**
 * Netlify serverless function: s3-img-proxy
 *
 * Proxies GET requests to S3 so the browser never makes a cross-origin
 * request directly to amazonaws.com (which would taint the canvas and
 * block export). The Vite dev proxy handles the same /api/s3-img/* path
 * during development, so behaviour is identical in both environments.
 *
 * Request path:  /api/s3-img/<s3-path>
 * Proxied to:    https://s3.amazonaws.com/<s3-path>
 */
export async function handler(event) {
  // Extract the S3 path from the function's path parameter.
  // Netlify passes the :splat capture as the last segment of event.path.
  // event.path will be something like /.netlify/functions/s3-img-proxy/bucket/key.png
  const prefix = '/.netlify/functions/s3-img-proxy'
  const s3Path = event.path.startsWith(prefix)
    ? event.path.slice(prefix.length)
    : event.path

  if (!s3Path || s3Path === '/') {
    return { statusCode: 400, body: 'Missing S3 path' }
  }

  const s3Url = `https://s3.amazonaws.com${s3Path}${event.rawQuery ? `?${event.rawQuery}` : ''}`

  try {
    const response = await fetch(s3Url)

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `S3 responded with ${response.status}`,
      }
    }

    // Read the image as a buffer and return it with the correct content-type.
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = response.headers.get('content-type') || 'image/png'

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        // Allow the browser to use this response in a canvas without tainting it.
        'Access-Control-Allow-Origin': '*',
        // Cache for 1 hour — screenshots don't change.
        'Cache-Control': 'public, max-age=3600',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (err) {
    return {
      statusCode: 502,
      body: `Proxy error: ${err?.message || String(err)}`,
    }
  }
}

/**
 * Utility functions for input sanitization and whitespace trimming across forms.
 */

/**
 * Strip dangerous control characters (including NULL bytes) and trim leading/trailing whitespace.
 */
export function sanitizeString(val: unknown): string {
  if (typeof val === 'object' && val !== null) {
    const objVal = (val as any).en || (val as any).es || Object.values(val)[0]
    if (typeof objVal === 'string') {
      return objVal.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
    }
  }
  if (typeof val !== 'string') return ''
  return val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
}

/**
 * Sanitize and normalize emails (lowercase & trimmed).
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return ''
  return sanitizeString(email).toLowerCase()
}

/**
 * Sanitize names and single-line text fields (trim + collapse multiple consecutive whitespace characters).
 */
export function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return ''
  return sanitizeString(name).replace(/\s+/g, ' ')
}

/**
 * Sanitize URLs (trim + strip dangerous protocols like javascript: or data:).
 */
export function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string') return ''
  const trimmed = sanitizeString(url)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return ''
  }
  return trimmed
}

/**
 * Recursively sanitize all string properties in a form data object / JSON payload.
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== 'object') return data

  const result: any = Array.isArray(data) ? [] : {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const lowerKey = key.toLowerCase()
      if (lowerKey.includes('email')) {
        result[key] = sanitizeEmail(value)
      } else if (
        lowerKey.includes('url') ||
        lowerKey.includes('site') ||
        lowerKey.includes('github') ||
        lowerKey.includes('linkedin') ||
        lowerKey.includes('devpost') ||
        lowerKey.includes('resume')
      ) {
        result[key] = sanitizeUrl(value)
      } else if (lowerKey.includes('name') || lowerKey.includes('first') || lowerKey.includes('last')) {
        result[key] = sanitizeName(value)
      } else {
        result[key] = sanitizeString(value)
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
          ? sanitizeFormData(item)
          : item
      )
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeFormData(value)
    } else {
      result[key] = value
    }
  }

  return result
}

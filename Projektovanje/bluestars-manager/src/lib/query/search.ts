import { z } from 'zod'

// Search params arrive from the URL as strings (or undefined). All outputs are
// optional so that <Link>/navigate() without search params type-check.
// Booleans travel as 'true'/'false' strings in the URL.

export const pageParam = z.coerce.number().int().min(0).catch(0).optional()
export const sizeParam = z.coerce.number().int().min(1).max(100).catch(20).optional()
export const stringParam = z.string().optional().catch(undefined)
export const numberParam = z.coerce.number().int().optional().catch(undefined)
export const booleanParam = z.enum(['true', 'false']).optional().catch(undefined)

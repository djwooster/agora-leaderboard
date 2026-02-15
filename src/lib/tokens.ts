import { customAlphabet } from 'nanoid'

// Readable share token (no ambiguous chars), 10 chars
const nanoidShare = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 10)

// UUID-style admin token (harder to guess)
const nanoidAdmin = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32)

export function generateShareToken(): string {
  return nanoidShare()
}

export function generateAdminToken(): string {
  return nanoidAdmin()
}

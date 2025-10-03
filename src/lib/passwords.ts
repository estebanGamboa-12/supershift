import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto"
import { promisify } from "util"

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres")
  }

  const salt = randomBytes(16)
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`
}

export async function verifyPassword(
  password: string,
  storedHash: string | null
): Promise<boolean> {
  if (!storedHash || typeof password !== "string" || password.length === 0) {
    return false
  }

  const [saltHex, keyHex] = storedHash.split(":")
  if (!saltHex || !keyHex) {
    return false
  }

  const salt = Buffer.from(saltHex, "hex")
  const storedKey = Buffer.from(keyHex, "hex")
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer

  if (derivedKey.length !== storedKey.length) {
    return false
  }

  return timingSafeEqual(derivedKey, storedKey)
}

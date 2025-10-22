import type { ShiftType } from "@/types/shifts"

const DB_NAME = "planloop-offline"
const DB_VERSION = 1

const USERS_STORE = "users"
const SHIFTS_STORE = "shifts"
const PENDING_STORE = "pending-requests"

const globalScope = ((): typeof globalThis | undefined => {
  if (typeof globalThis !== "undefined") {
    return globalThis
  }
  if (typeof self !== "undefined") {
    return self as unknown as typeof globalThis
  }
  if (typeof window !== "undefined") {
    return window
  }
  return undefined
})()

type Nullable<T> = T | null

type IDBLike = IDBFactory & { cmp?: (first: IDBValidKey, second: IDBValidKey) => number }

const indexedDBFactory: Nullable<IDBLike> = globalScope
  ? (globalScope as typeof globalThis & { indexedDB?: IDBLike }).indexedDB ?? null
  : null

let dbPromise: Promise<IDBDatabase | null> | null = null

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
  })
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"))
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"))
  })
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (!indexedDBFactory) {
    return null
  }

  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
    try {
      const request = indexedDBFactory.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(USERS_STORE)) {
          db.createObjectStore(USERS_STORE, { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains(SHIFTS_STORE)) {
          const store = db.createObjectStore(SHIFTS_STORE, { keyPath: "id" })
          store.createIndex("byUser", "userId", { unique: false })
        }

        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const pending = db.createObjectStore(PENDING_STORE, { keyPath: "id" })
          pending.createIndex("byUser", "userId", { unique: false })
          pending.createIndex("byCreatedAt", "createdAt", { unique: false })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          dbPromise = null
        }
        resolve(db)
      }

      request.onerror = () => {
        reject(request.error ?? new Error("No se pudo abrir la base de datos offline"))
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error("IndexedDB open failed"))
    }
  }).catch((error) => {
    console.error("IndexedDB initialization error", error)
    return null
  })

  return dbPromise
}

export type CachedUser = {
  id: string
  name: string
  email: string
  calendarId: number | null
}

export type CachedShiftEvent = {
  id: number
  userId: string
  date: string
  type: ShiftType
  start: string
  end: string
  note?: string
  label?: string
  color?: string
  pluses?: {
    night: number
    holiday: number
    availability: number
    other: number
  }
}

export type ShiftMutationRequestBody = {
  date: string
  type: string
  note: string | null
  label: string | null
  color: string | null
  plusNight: number
  plusHoliday: number
  plusAvailability: number
  plusOther: number
  userId: string
}

export type PendingShiftRequest = {
  id: string
  userId: string
  method: "POST" | "PATCH" | "DELETE"
  url: string
  body?: ShiftMutationRequestBody
  shiftId?: number
  optimisticId?: number
  createdAt: number
}

export async function cacheUsers(users: CachedUser[]): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    return
  }

  const tx = db.transaction(USERS_STORE, "readwrite")
  const store = tx.objectStore(USERS_STORE)
  store.clear()
  for (const user of users) {
    store.put(user)
  }
  await waitForTransaction(tx)
}

export async function readCachedUsers(): Promise<CachedUser[]> {
  const db = await openDatabase()
  if (!db) {
    return []
  }

  const tx = db.transaction(USERS_STORE, "readonly")
  const store = tx.objectStore(USERS_STORE)
  const users = await promisifyRequest(store.getAll())
  await waitForTransaction(tx)
  return users as CachedUser[]
}

export async function cacheShiftsForUser(
  userId: string,
  shifts: CachedShiftEvent[],
): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    return
  }

  const tx = db.transaction(SHIFTS_STORE, "readwrite")
  const store = tx.objectStore(SHIFTS_STORE)
  const index = store.index("byUser")
  const keys = await promisifyRequest(index.getAllKeys(IDBKeyRange.only(userId)))
  for (const key of keys) {
    store.delete(key)
  }
  for (const shift of shifts) {
    store.put(shift)
  }
  await waitForTransaction(tx)
}

export async function readCachedShiftsForUser(userId: string): Promise<CachedShiftEvent[]> {
  const db = await openDatabase()
  if (!db) {
    return []
  }

  const tx = db.transaction(SHIFTS_STORE, "readonly")
  const store = tx.objectStore(SHIFTS_STORE)
  const index = store.index("byUser")
  const result = await promisifyRequest(index.getAll(IDBKeyRange.only(userId)))
  await waitForTransaction(tx)
  return (result as CachedShiftEvent[]) ?? []
}

export async function addPendingShiftRequest(entry: PendingShiftRequest): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    return
  }

  const tx = db.transaction(PENDING_STORE, "readwrite")
  tx.objectStore(PENDING_STORE).put(entry)
  await waitForTransaction(tx)
}

export async function removePendingShiftRequest(id: string): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    return
  }

  const tx = db.transaction(PENDING_STORE, "readwrite")
  tx.objectStore(PENDING_STORE).delete(id)
  await waitForTransaction(tx)
}

export async function listPendingShiftRequests(userId: string): Promise<PendingShiftRequest[]> {
  const db = await openDatabase()
  if (!db) {
    return []
  }

  const tx = db.transaction(PENDING_STORE, "readonly")
  const store = tx.objectStore(PENDING_STORE)
  const index = store.index("byUser")
  const entries = await promisifyRequest(index.getAll(IDBKeyRange.only(userId)))
  await waitForTransaction(tx)
  const pending = (entries as PendingShiftRequest[]) ?? []
  return pending.sort((a, b) => a.createdAt - b.createdAt)
}

export async function updatePendingRequestsForOptimisticId(
  userId: string,
  optimisticId: number,
  newShiftId: number,
): Promise<PendingShiftRequest[]> {
  const db = await openDatabase()
  if (!db) {
    return []
  }

  const tx = db.transaction(PENDING_STORE, "readwrite")
  const store = tx.objectStore(PENDING_STORE)
  const index = store.index("byUser")
  const entries = (await promisifyRequest(
    index.getAll(IDBKeyRange.only(userId)),
  )) as PendingShiftRequest[]

  const updatedEntries: PendingShiftRequest[] = []

  for (const entry of entries) {
    if (entry.optimisticId !== optimisticId) {
      continue
    }

    if (entry.method === "POST") {
      continue
    }

    const updatedEntry: PendingShiftRequest = {
      ...entry,
      shiftId: newShiftId,
      url: `/api/shifts/${newShiftId}?userId=${userId}`,
    }

    if ("optimisticId" in updatedEntry) {
      delete (updatedEntry as { optimisticId?: number }).optimisticId
    }

    store.put(updatedEntry)
    updatedEntries.push(updatedEntry)
  }

  await waitForTransaction(tx)
  return updatedEntries
}

export async function countPendingShiftRequests(userId: string): Promise<number> {
  const db = await openDatabase()
  if (!db) {
    return 0
  }

  const tx = db.transaction(PENDING_STORE, "readonly")
  const store = tx.objectStore(PENDING_STORE)
  const index = store.index("byUser")
  const count = await promisifyRequest(index.count(IDBKeyRange.only(userId)))
  await waitForTransaction(tx)
  return count ?? 0
}

export async function clearPendingRequestsForUser(userId: string): Promise<void> {
  const db = await openDatabase()
  if (!db) {
    return
  }

  const tx = db.transaction(PENDING_STORE, "readwrite")
  const store = tx.objectStore(PENDING_STORE)
  const index = store.index("byUser")
  const keys = await promisifyRequest(index.getAllKeys(IDBKeyRange.only(userId)))
  for (const key of keys) {
    store.delete(key)
  }
  await waitForTransaction(tx)
}

export function isOfflineStorageSupported(): boolean {
  return Boolean(indexedDBFactory)
}

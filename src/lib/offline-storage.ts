import { get, set, del } from 'idb-keyval'

export interface OfflineVisitReport {
  id: string // UUID of the visit
  buyerName: string
  data: Record<string, unknown> // The form data
  coords: { lat: number, lng: number } | null
  timestamp: number
}

const STORE_KEY = 'offline_visit_reports'
const PLANNED_STORE_KEY = 'cached_planned_visits'
const NEW_VISITS_STORE_KEY = 'offline_new_visits'

export async function saveOfflineReport(report: OfflineVisitReport) {
  const reports = (await get<OfflineVisitReport[]>(STORE_KEY)) || []
  const filtered = reports.filter(r => r.id !== report.id)
  filtered.push(report)
  await set(STORE_KEY, filtered)
}

export async function getOfflineReports(): Promise<OfflineVisitReport[]> {
  return (await get<OfflineVisitReport[]>(STORE_KEY)) || []
}

export async function removeOfflineReport(visitId: string) {
  const reports = (await get<OfflineVisitReport[]>(STORE_KEY)) || []
  const filtered = reports.filter(r => r.id !== visitId)
  await set(STORE_KEY, filtered)
}

export async function clearOfflineReports() {
  await del(STORE_KEY)
}

// --- Planned Visits Cache ---
export async function cachePlannedVisits(visits: unknown[]) {
    await set(PLANNED_STORE_KEY, visits)
}

export async function getCachedPlannedVisit(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visits = (await get<any[]>(PLANNED_STORE_KEY)) || []
    return visits.find(v => v.id === id)
}

// --- Offline New Visits ---
export async function saveOfflineNewVisit(visit: unknown) {
    const visits = (await get<unknown[]>(NEW_VISITS_STORE_KEY)) || []
    visits.push(visit)
    await set(NEW_VISITS_STORE_KEY, visits)
}

export async function getOfflineNewVisits() {
    return (await get<unknown[]>(NEW_VISITS_STORE_KEY)) || []
}

export async function removeOfflineNewVisit(tempId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visits = (await get<any[]>(NEW_VISITS_STORE_KEY)) || []
    const filtered = visits.filter(v => v.id !== tempId)
    await set(NEW_VISITS_STORE_KEY, filtered)
}

export async function clearOfflineNewVisits() {
    await del(NEW_VISITS_STORE_KEY)
}

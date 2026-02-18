import { get, set, del, values } from 'idb-keyval'

export interface OfflineVisitReport {
  id: string // UUID of the visit
  buyerName: string
  data: any // The form data
  coords: { lat: number, lng: number } | null
  timestamp: number
}

const STORE_KEY = 'offline_visit_reports'

export async function saveOfflineReport(report: OfflineVisitReport) {
  const reports = (await get<OfflineVisitReport[]>(STORE_KEY)) || []
  // Remove existing report for this visit if exists (overwrite)
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

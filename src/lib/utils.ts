import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatVisitForWhatsApp(data: {
  agentName: string;
  date: string;
  county: string;
  businessType: string;
  activeFarmers: number | string;
  contactName: string;
  contactPhone: string;
  activityDone: string;
  notes: string;
}) {
  return `BRD Name: ${data.agentName || '-'}
Date: ${data.date || '-'}
County: ${data.county || '-'}
Category of Business: ${data.businessType || '-'}
Active Farmers: ${data.activeFarmers ?? '-'}
Contact Person: ${data.contactName || '-'} & ${data.contactPhone || '-'}
Activity Done: ${data.activityDone || '-'}
Feedback / Visit Notes: ${data.notes || '-'}`;
}

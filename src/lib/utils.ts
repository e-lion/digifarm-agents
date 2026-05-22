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
  designation?: string;
  activityDone: string;
  notes: string;
}) {
  return `*BDR Name:* ${data.agentName || '-'}
*Date:* ${data.date || '-'}
*County:* ${data.county || '-'}
*Category of Business:* ${data.businessType || '-'}
*Active Farmers:* ${data.activeFarmers ?? '-'}
*Contact Person:* ${data.contactName || '-'}
*Designation:* ${data.designation || '-'}
*Activity Done:* ${data.activityDone || '-'}
*Feedback / Visit Notes:* ${data.notes || '-'}`;
}

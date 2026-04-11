import type { Timestamp } from 'firebase/firestore'

export interface MeetingReport {
  uid: string
  displayName: string
  newClients: number
  contracts: number
  activities: number
  notes?: string
}

export interface Meeting {
  id: string
  date: string           // YYYY-MM-DD
  spaceId?: string
  spaceName?: string
  memo?: string
  reports: MeetingReport[]
  totals: {
    newClients: number
    contracts: number
    activities: number
  }
  createdBy: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MeetingSummary {
  id: string
  date: string
  spaceName?: string
  totalNewClients: number
  totalContracts: number
  totalActivities: number
  participantCount: number
  createdAt: Timestamp
}

export interface MeetingForm {
  date: string
  spaceId?: string
  memo?: string
  reports: {
    uid: string
    displayName: string
    newClients: number | null
    contracts: number | null
    activities: number | null
    notes?: string
  }[]
}

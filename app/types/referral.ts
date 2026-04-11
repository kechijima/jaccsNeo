import type { Timestamp } from 'firebase/firestore'

export interface Referral {
  id: string
  fromCustomerId: string    // 紹介した顧客
  fromCustomerName: string
  toCustomerId: string      // 紹介された顧客
  toCustomerName: string
  notes?: string
  createdBy: string
  createdAt: Timestamp
}

export interface ReferralForm {
  toCustomerId: string
  notes?: string
}

import type { Purchase } from '../types'

export const seedPurchases: Purchase[] = []

export const freshScanResult: Purchase = {
  id: 'scan-result',
  name: 'Sony Headphones',
  amount: 4999,
  purchaseDate: 'Sep 14, 2026',
  returnDeadline: 'Sep 25, 2026',
  daysLeft: 10,
  warrantyMonths: 12,
  status: 'soon',
  reason: 'Items can be returned within 10 days of purchase, per the store’s return policy on your invoice.',
}
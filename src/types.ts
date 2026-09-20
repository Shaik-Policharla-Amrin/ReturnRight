export interface Purchase {
  id: string
  name: string
  amount: number
  purchaseDate: string
  returnDeadline: string
  daysLeft: number
  warrantyMonths: number
  status: 'soon' | 'safe' | 'expired'
  reason?: string
  needsPolicyReview?: boolean
  returnReason?: string
  sellerFeedback?: string
  merchant?: string
  orderId?: string
}

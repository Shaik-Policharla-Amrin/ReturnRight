import type { Purchase } from '../types'

type ReturnStatus = Pick<Purchase, 'daysLeft' | 'status'>

const months: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
}

function parseLocalDate(value: string): Date | undefined {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!match) return undefined

  const month = months[match[2].toLowerCase()]
  if (month === undefined) return undefined

  const date = new Date(Number(match[3]), month, Number(match[1]))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function getReturnStatus(returnDeadline: string): ReturnStatus | undefined {
  const deadline = parseLocalDate(returnDeadline)
  if (!deadline) return undefined

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((deadline.getTime() - today.getTime()) / 86_400_000)

  return { daysLeft, status: daysLeft < 0 ? 'expired' : daysLeft <= 14 ? 'soon' : 'safe' }
}

export function returnStatusLabel(purchase: Pick<Purchase, 'daysLeft' | 'status'>): string {
  if (purchase.status === 'expired') {
    const daysAgo = Math.abs(purchase.daysLeft)
    return `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`
  }

  if (purchase.daysLeft === 0) return 'Last day to return'
  return `${purchase.daysLeft}d left`
}

import type { Purchase } from './types'
import { getReturnStatus } from './utils/deadline'

const ignoredLine =
  /^(invoice|tax invoice|billing address|shipping address|sold by|shipped by|order id|order number|order date|invoice no|invoice number|invoice date|gstin|pan|hsn|qty|quantity|description|amount|total|subtotal|tax|cgst|sgst|igst|payment|customer|place of supply|place of delivery|original for recipient)$/i

function linesFrom(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/\s+/g, ' ').trim()
    )
    .filter(Boolean)
}

function isPriceLine(line: string): boolean {
  return /^\s*(?:₹|Rs\.?|INR|Z)?\s*[\d,]+(?:\.\d{1,2})?\s*$/.test(
    line
  )
}

function cleanProductName(value: string): string {
  const cleaned = value
    .replace(/^\s*\d{1,3}\s+/, '')
    .replace(/^item\s*[:\-]?\s*/i, '')
    .replace(/^product\s*[:\-]?\s*/i, '')
    .replace(/^description\s*[:\-]?\s*/i, '')
    .replace(/\b(?:colour|color|model|hsn|serial\s*no|sku|size)\s*[:\-].*$/i, '')
    .replace(/\bshipping\s+charges?\b.*$/i, '')
    .replace(/(?:₹|â‚¹|Rs\.?|INR)\s*[\d,]+(?:\.\d{1,2})?.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  // OCR often merges invoice table columns into the product text. Keep text
  // through the actual product type and drop the trailing price columns.
  const typeMatch = cleaned.match(/\b(headphones?|earphones?|earbuds?|smartwatch|laptop|tablet|speaker|camera|keyboard|mouse|charger|shoes?|shirts?|dress|kurta|jeans|bag|watch|phone|mobile)\b/i)
  return typeMatch ? cleaned.slice(0, typeMatch.index! + typeMatch[0].length).trim() : cleaned
}

function looksLikeProduct(line: string): boolean {
  if (ignoredLine.test(line) || isPriceLine(line)) return false
  if (/^(?:sl\.?\s*no|qty|unit\s*price|net\s*amount|tax\s*(?:rate|type|amount)|total\s*amount|shipping\s*charges?|colour|color|model|hsn|serial\s*no|sku|size)\b/i.test(line)) return false
  if (/\b(?:billing|shipping)\s+address\b|\b(?:order|invoice)\s+(?:number|date|details)\b|amount\s+in\s+words|authori[sz]ed\s+signatory/i.test(line)) return false
  if (line.replace(/[^A-Za-z]/g, '').length < 5) return false
  if (/\b(?:earbuds?|earphones?|headphones?|smartwatch|laptop|tablet|speaker|camera|keyboard|mouse|charger|shoes?|shirts?|dress|kurta|jeans|bag|watch|phone|mobile)\b/i.test(line)) return true
  return /[A-Za-z]{3,}/.test(line) && !/^(?:total|tax|igst|cgst|sgst|discount|amount|payment|return|warranty)\b/i.test(line)
}

/* ---------------- PRODUCT ---------------- */

function productFrom(
  lines: string[],
): string {
  const descriptionIndex = lines.findIndex((line) => /\bdescription\b/i.test(line))
  const tableEnd = (start: number) => lines.findIndex((line, index) => index > start && /^(?:total|amount\s+in\s+words|offers\s+applied|payment\s+information)\b/i.test(line))
  const end = descriptionIndex >= 0 ? tableEnd(descriptionIndex) : -1
  const candidates = descriptionIndex >= 0
    ? lines.slice(descriptionIndex + 1, end > descriptionIndex ? end : descriptionIndex + 18)
    : lines

  const products = candidates
    .filter(looksLikeProduct)
    .map(cleanProductName)
    .filter((product) => product.length >= 4)

  if (products.length > 1) {
    return `${products.length} items — review receipt`
  }

  if (products[0]) return products[0]

  // Do not pretend the uploaded filename is a product. A review state is
  // safer than a confident but wrong purchase record.
  return 'Product needs review'
}

/* ---------------- NUMBER ---------------- */

function numberFrom(
  value: string | undefined
): number {

  if (!value) {
    return 0
  }

  const cleaned =
    value
      .replace(/₹/g, '')
      .replace(/Rs\.?/gi, '')
      .replace(/INR/gi, '')
      .replace(/Z/g, '')
      .replace(/[^\d.]/g, '')
      .trim()

  const number =
    Number(cleaned)

  return Number.isFinite(number)
    ? number
    : 0
}

/* ---------------- AMOUNT ---------------- */

function amountFrom(
  text: string,
  lines: string[],
  product: string,
): number {

  /*
   * PRIORITY 1:
   *
   * Amount Paid
   *
   * Your OCR:
   *
   * Amount Paid: Z 3,499.00
   */

  const amountPaid =
    text.match(
      /amount\s*paid\s*[:\-]?\s*(?:₹|Rs\.?|INR|Z)?\s*([\d,]+(?:\.\d{1,2})?)/i
    )

  if (amountPaid?.[1]) {

    const amount =
      numberFrom(amountPaid[1])

    if (amount > 0) {
      return amount
    }
  }

  /*
   * PRIORITY 2:
   *
   * Total Amount
   */

  const totalAmount =
    text.match(
      /total\s*amount\s*[:\-]?\s*(?:₹|Rs\.?|INR|Z)?\s*([\d,]+(?:\.\d{1,2})?)/i
    )

  if (totalAmount?.[1]) {

    const amount =
      numberFrom(totalAmount[1])

    if (amount > 0) {
      return amount
    }
  }

  /*
   * PRIORITY 3:
   *
   * Item Total
   */

  const itemTotal =
    text.match(
      /item\s*total\s*[:\-]?\s*(?:₹|Rs\.?|INR|Z)?\s*([\d,]+(?:\.\d{1,2})?)/i
    )

  if (itemTotal?.[1]) {

    const amount =
      numberFrom(itemTotal[1])

    if (amount > 0) {
      return amount
    }
  }

  /*
   * PRIORITY 4:
   *
   * Grand Total
   */

  const grandTotal =
    text.match(
      /grand\s*total\s*[:\-]?\s*(?:₹|Rs\.?|INR|Z)?\s*([\d,]+(?:\.\d{1,2})?)/i
    )

  if (grandTotal?.[1]) {

    const amount =
      numberFrom(grandTotal[1])

    if (amount > 0) {
      return amount
    }
  }

  /*
   * PRIORITY 5:
   *
   * Net Payable
   */

  const netPayable =
    text.match(
      /net\s*payable\s*[:\-]?\s*(?:₹|Rs\.?|INR|Z)?\s*([\d,]+(?:\.\d{1,2})?)/i
    )

  if (netPayable?.[1]) {

    const amount =
      numberFrom(netPayable[1])

    if (amount > 0) {
      return amount
    }
  }

  /*
   * PRIORITY 6:
   *
   * Order Total
   *
   * OCR sometimes turns:
   *
   * ₹3,499
   *
   * into:
   *
   * 23,499
   *
   * Therefore Total Amount above is preferred.
   */

  const orderTotal =
    text.match(
      /order\s*total\s*[:\-]?\s*(?:₹|Rs\.?|INR|Z)?\s*([\d,]+(?:\.\d{1,2})?)/i
    )

  if (orderTotal?.[1]) {
    const amount = numberFrom(orderTotal[1])
    if (amount > 0) return amount
  }

  // GST invoices often use a plain "TOTAL" row. The last money value in that
  // row is the invoice total, and is safer than an individual item-row value.
  const totalIndex = lines.findIndex((line) => /^(?:grand\s+|order\s+)?total\s*[:\-]?/i.test(line))
  if (totalIndex >= 0) {
    const totalText = lines.slice(totalIndex, totalIndex + 3).join(' ')
    const rowValues = [...totalText.matchAll(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})/g)]
      .map((match) => numberFrom(match[1]))
      .filter((value) => value > 0)
    if (rowValues.length) return rowValues[rowValues.length - 1]
  }

  // Compact OCR can merge a product and all table columns into one line. Use
  // that line only after invoice-total labels were checked.
  const productKeyword = product.match(/headphones?|earphones?|earbuds?|smartwatch|laptop|tablet|speaker|camera|shirts?|dress|kurta|jeans|bag|watch|phone|mobile/i)?.[0]
  const productRow = lines.find((line) => Boolean(productKeyword && new RegExp(productKeyword, 'i').test(line)))
  if (productRow) {
    const rowValues = [...productRow.matchAll(/(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})/gi)]
      .map((match) => numberFrom(match[1]))
      .filter((value) => value >= 50)
    if (rowValues.length) return rowValues[rowValues.length - 1]
  }

  /*
   * Final fallback.
   */

  const values: number[] = []

  const matches =
    text.matchAll(
      /(?:₹|Rs\.?|INR|Z)\s*([\d,]+(?:\.\d{1,2})?)/gi
    )

  for (const match of matches) {

    const value =
      numberFrom(match[1])

    if (value > 0) {
      values.push(value)
    }
  }

  return values.length
    ? Math.max(...values)
    : 0
}

/* ---------------- DATE ---------------- */

function parseDate(
  value: string
): Date | undefined {

  const cleaned =
    value
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  /*
   * 07 Sep 2026
   */

  const monthDate =
    cleaned.match(
      /^(\d{1,2})\s+([A-Za-z]{3,12})\s+(\d{2,4})$/
    )

  if (monthDate) {

    const day =
      Number(monthDate[1])

    const month =
      monthDate[2]

    let year =
      Number(monthDate[3])

    if (year < 100) {
      year += 2000
    }

    const parsed =
      new Date(
        `${month} ${day}, ${year}`
      )

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed
    }
  }

  /*
   * 07/09/2026 or 28.10.2019
   */

  const numericDate =
    cleaned.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
    )

  if (numericDate) {

    const day =
      Number(numericDate[1])

    const month =
      Number(numericDate[2]) - 1

    let year =
      Number(numericDate[3])

    if (year < 100) {
      year += 2000
    }

    const parsed =
      new Date(
        year,
        month,
        day
      )

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed
    }
  }

  return undefined
}

function dateFrom(
  text: string
): Date {

  /*
   * First look specifically for
   * Order Date.
   *
   * Flipkart OCR has the heading and
   * values on separate lines:
   *
   * Order ID Order Date Invoice No...
   *
   * OD... 07 Sep 2026 FPLF...
   *
   * Therefore we first search for
   * the known invoice date pattern.
   */

  const orderDate =
    text.match(
      /order\s*date\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,12}\s+\d{2,4})/i
    )

  if (orderDate?.[1]) {

    const parsed =
      parseDate(orderDate[1])

    if (parsed) {
      return parsed
    }
  }

  const numericOrderDate = text.match(
    /order\s*date\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
  )

  if (numericOrderDate?.[1]) {
    const parsed = parseDate(numericOrderDate[1])
    if (parsed) return parsed
  }

  /*
   * Look for a date after the
   * Order ID heading/value block.
   *
   * This specifically handles your
   * Flipkart invoice.
   */

  const orderIdMatch =
    text.match(
      /order\s*id[\s\S]{0,200}?(\d{1,2}\s+[A-Za-z]{3,12}\s+\d{2,4})/i
    )

  if (orderIdMatch?.[1]) {

    const parsed =
      parseDate(orderIdMatch[1])

    if (parsed) {
      return parsed
    }
  }

  /*
   * Invoice Date fallback.
   */

  const invoiceDate =
    text.match(
      /invoice\s*date\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,12}\s+\d{2,4})/i
    )

  if (invoiceDate?.[1]) {

    const parsed =
      parseDate(invoiceDate[1])

    if (parsed) {
      return parsed
    }
  }

  /*
   * Generic date fallback.
   *
   * The first date in this invoice is
   * the order date: 07 Sep 2026.
   */

  const dates = [
    ...text.matchAll(
      /\b(\d{1,2}\s+[A-Za-z]{3,12}\s+\d{2,4})\b/g
    ),
  ]

  for (const match of dates) {

    const parsed =
      parseDate(match[1])

    if (parsed) {
      return parsed
    }
  }

  /*
   * Numeric date fallback.
   */

  const numericDates = [
    ...text.matchAll(
      /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/g
    ),
  ]

  for (const match of numericDates) {

    const parsed =
      parseDate(match[1])

    if (parsed) {
      return parsed
    }
  }

  /*
   * Last resort.
   */

  return new Date()
}

/* ---------------- RETURN POLICY ---------------- */

function daysFromPolicy(
  text: string
): number | undefined {

  const patterns = [

    /return(?:able)?\s+(?:within|in)\s+(\d{1,3})\s*days?/i,

    /return\s+window\s*(?:of)?\s*(\d{1,3})\s*days?/i,

    /easy\s+(\d{1,3})\s*day\s+return/i,

    /(\d{1,3})\s*day\s+return/i,

    /eligible\s+for\s+return\s+within\s+(\d{1,3})\s*days?/i,
  ]

  for (const pattern of patterns) {

    const match =
      text.match(pattern)

    if (match?.[1]) {

      const days =
        Number(match[1])

      if (
        days > 0 &&
        days <= 365
      ) {
        return days
      }
    }
  }

  return undefined
}

/* ---------------- WARRANTY ---------------- */

function warrantyFrom(
  text: string
): number {

  const yearMatch =
    text.match(
      /(\d{1,2})\s*(?:year|years)\s*(?:manufacturer\s*)?warranty/i
    )

  if (yearMatch?.[1]) {
    return (
      Number(yearMatch[1]) * 12
    )
  }

  const monthMatch =
    text.match(
      /(\d{1,2})\s*(?:month|months)\s*(?:manufacturer\s*)?warranty/i
    )

  if (monthMatch?.[1]) {
    return Number(monthMatch[1])
  }

  return 0
}

/* ---------------- VALUE AFTER LABEL ---------------- */

function valueAfter(
  lines: string[],
  label: RegExp
): string | undefined {

  const index =
    lines.findIndex((line) =>
      label.test(line)
    )

  if (index < 0) {
    return undefined
  }

  const inline =
    lines[index]
      .replace(label, '')
      .replace(/^[:\-\s]+/, '')
      .trim()

  if (inline) {
    return inline
  }

  const nextLine =
    lines[index + 1]

  if (
    nextLine &&
    !ignoredLine.test(nextLine)
  ) {
    return nextLine.trim()
  }

  return undefined
}

/* ---------------- MERCHANT ---------------- */

function merchantFrom(
  lines: string[]
): string | undefined {

  return valueAfter(
    lines,
    /^sold\s*by\s*[:\-]?\s*/i
  )
}

/* ---------------- ORDER ID ---------------- */

function orderIdFrom(
  lines: string[]
): string | undefined {

  return valueAfter(
    lines,
    /^order\s*(?:id|number)\s*[:\-]?\s*/i
  )
}

export function isReturnDocument(text: string): boolean {
  return /\b(?:purchase\s+return\s+invoice|return\s+(?:invoice|credit\s+note)|credit\s+note)\b/i.test(text)
}

/* ---------------- MAIN PARSER ---------------- */

export function purchaseFromInvoice(
  file: File,
  text: string,
  index: number
): Purchase {

  const lines =
    linesFrom(text)

  const purchaseDate =
    dateFrom(text)

  const policyDays =
    daysFromPolicy(text)

  const deadline =
    new Date(purchaseDate)

  if (policyDays) {

    deadline.setDate(
      deadline.getDate() +
      policyDays
    )
  }

  const formatDate =
    (date: Date) =>
      date.toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      )

  const product =
    productFrom(
      lines,
    )

  const amount =
    amountFrom(text, lines, product)

  const merchant =
    merchantFrom(lines)

  const orderId =
    orderIdFrom(lines)

  const warrantyMonths =
    warrantyFrom(text)

  console.log(
    'FINAL PARSED PURCHASE:',
    {
      product,
      amount,
      purchaseDate,
      policyDays,
      warrantyMonths,
      merchant,
      orderId,
    }
  )

  const returnDeadline =
    policyDays
      ? formatDate(deadline)
      : 'Policy needs review'

  const returnStatus = policyDays
    ? getReturnStatus(returnDeadline)
    : undefined

  return {

    id:
      `invoice-${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    name:
      product,

    amount,

    purchaseDate:
      formatDate(
        purchaseDate
      ),

    returnDeadline,

    daysLeft:
      returnStatus?.daysLeft ?? 0,

    warrantyMonths,

    status:
      returnStatus?.status ?? 'safe',

    needsPolicyReview:
      !policyDays,

    merchant,

    orderId,

    reason:
      policyDays
        ? `A ${policyDays}-day return window was found in the uploaded invoice.`
        : 'Receipt saved successfully. Confirm the retailer’s return policy before relying on a deadline.',
  }
}

import type { Purchase } from './types'

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

function cleanFileName(file: File): string {
  return file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim()
}

function isPriceLine(line: string): boolean {
  return /^\s*(?:₹|Rs\.?|INR|Z)?\s*[\d,]+(?:\.\d{1,2})?\s*$/.test(
    line
  )
}

function cleanProductName(value: string): string {
  const cleaned = value
    .replace(/^item\s*[:\-]?\s*/i, '')
    .replace(/^product\s*[:\-]?\s*/i, '')
    .replace(/^description\s*[:\-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  // OCR often merges invoice table columns into the product text. Keep text
  // through the actual product type and drop the trailing price columns.
  const typeMatch = cleaned.match(/\b(headphones?|earphones?|smartwatch|laptop|tablet|speaker|camera|keyboard|mouse|charger|shoes?|shirt|bag)\b/i)
  return typeMatch ? cleaned.slice(0, typeMatch.index! + typeMatch[0].length).trim() : cleaned
}

/* ---------------- PRODUCT ---------------- */

function productFrom(
  lines: string[],
  file: File
): string {

  /*
   * Your Flipkart OCR looks like:
   *
   * tem Product Description Qty Unit Price...
   *
   * So we search for "Product Description"
   * inside the line instead of requiring
   * the entire line to equal it.
   */

  const descriptionIndex =
    lines.findIndex((line) =>
      /product\s+description/i.test(line)
    )

  if (descriptionIndex >= 0) {

    const candidates =
      lines.slice(
        descriptionIndex + 1,
        descriptionIndex + 15
      )

    for (
      let i = 0;
      i < candidates.length;
      i++
    ) {

      const line =
        candidates[i]

      if (!line) continue

      if (ignoredLine.test(line)) {
        continue
      }

      if (isPriceLine(line)) {
        continue
      }

      if (
        /^(qty|quantity|unit price|discount|taxable value|igst|cgst|sgst|total amount)$/i.test(
          line
        )
      ) {
        continue
      }

      /*
       * Strong product indicators.
       */
      if (
        /noise\s+colorfit/i.test(line) ||
        /smartwatch/i.test(line) ||
        /headphone/i.test(line) ||
        /earphone/i.test(line) ||
        /laptop/i.test(line) ||
        /tablet/i.test(line) ||
        /speaker/i.test(line) ||
        /camera/i.test(line)
      ) {

        let product =
          line

        /*
         * Example:
         *
         * Noise ColorFit Pulse 2 Max
         * Smartwatch
         *
         * Join them.
         */
        const nextLine =
          candidates[i + 1]

        if (
          nextLine &&
          !ignoredLine.test(nextLine) &&
          !isPriceLine(nextLine) &&
          /smartwatch|headphone|earphone|laptop|tablet|speaker|camera/i.test(
            nextLine
          )
        ) {
          product +=
            ` ${nextLine}`
        }

        return cleanProductName(product)
      }
    }
  }

  /*
   * Fallback search.
   *
   * IMPORTANT:
   * Never interpret a phone number as a product.
   */
  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const line =
      lines[i]

    if (ignoredLine.test(line)) {
      continue
    }

    if (isPriceLine(line)) {
      continue
    }

    if (/phone\s*:/i.test(line)) {
      continue
    }

    if (/\b\d{10}\b/.test(line)) {
      continue
    }

    if (
      /smartwatch|headphone|earphone|laptop|tablet|speaker|camera/i.test(
        line
      )
    ) {

      let product =
        line

      const nextLine =
        lines[i + 1]

      if (
        nextLine &&
        !ignoredLine.test(nextLine) &&
        !isPriceLine(nextLine) &&
        /smartwatch|headphone|earphone|laptop|tablet|speaker|camera/i.test(
          nextLine
        )
      ) {
        product +=
          ` ${nextLine}`
      }

      return cleanProductName(product)
    }
  }

  return (
    cleanFileName(file) ||
    'New purchase'
  )
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

  // On compact invoices, OCR commonly combines a product and all table
  // columns into one line. The last decimal/currency value is the line total.
  const productRow = lines.find((line) => {
    const keyword = product.match(/headphones?|earphones?|smartwatch|laptop|tablet|speaker|camera/i)?.[0]
    return Boolean(keyword && new RegExp(keyword, 'i').test(line))
  })
  if (productRow) {
    const rowValues = [...productRow.matchAll(/(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})/gi)]
      .map((match) => numberFrom(match[1]))
      .filter((value) => value >= 50)
    if (rowValues.length) return rowValues[rowValues.length - 1]
  }

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

    return numberFrom(
      orderTotal[1]
    )
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
   * 07/09/2026
   */

  const numericDate =
    cleaned.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/
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
      /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/g
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
      file
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

    returnDeadline:
      policyDays
        ? formatDate(
            deadline
          )
        : 'Policy needs review',

    daysLeft:
      policyDays ?? 0,

    warrantyMonths,

    status:
      policyDays &&
      policyDays <= 14
        ? 'soon'
        : 'safe',

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

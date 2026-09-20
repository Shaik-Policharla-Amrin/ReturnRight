import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Check,
  ShieldCheck,
  Store,
  AlertCircle,
  Copy,
  Mail,
  MessageSquare,
  Trash2,
} from 'lucide-react'
import TopBar from '../components/TopBar'
import { usePurchases } from '../context/PurchaseContext'
import { freshScanResult } from '../data/seed'

const returnReasons = [
  'Wrong size or fit',
  'Damaged or defective',
  'Not as described',
  'Changed my mind',
  'Late delivery',
  'Other',
]

function cleanMerchant(
  merchant: string | undefined,
): string | undefined {
  if (!merchant) return undefined

  const value = merchant
    .replace(/\s+/g, ' ')
    .trim()

  if (
    /billing address/i.test(value) ||
    /shipping address/i.test(value) ||
    /sold by/i.test(value) ||
    value.length > 100
  ) {
    return undefined
  }

  return value
}

function cleanOrderId(
  orderId: string | undefined,
): string | undefined {
  if (!orderId) return undefined

  if (
    /order date/i.test(orderId) ||
    /invoice no/i.test(orderId) ||
    /invoice date/i.test(orderId) ||
    /place of supply/i.test(orderId)
  ) {
    return undefined
  }

  const cleaned = orderId
    .replace(
      /^order\s*(id|number)\s*[:\-]?\s*/i,
      '',
    )
    .trim()

  return cleaned || undefined
}

function parsePurchaseDate(value: string): Date | undefined {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]{3,12})\s+(\d{4})$/)
  if (!match) return undefined
  const parsed = new Date(`${match[2]} ${match[1]}, ${match[3]}`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export default function PurchaseDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()

  const {
    addPurchase,
    getPurchase,
    updatePurchase,
    deletePurchase,
  } = usePurchases()

  const isFreshScan =
    location.pathname === '/scan/result'

  const foundPurchase =
    isFreshScan
      ? freshScanResult
      : id
        ? getPurchase(id)
        : undefined

  const [policyDays, setPolicyDays] =
    useState(
      foundPurchase?.daysLeft
        ? String(foundPurchase.daysLeft)
        : '10',
    )

  const [returnReason, setReturnReason] =
    useState(
      foundPurchase?.returnReason ?? '',
    )

  const [sellerFeedback, setSellerFeedback] =
    useState(
      foundPurchase?.sellerFeedback ?? '',
    )

  const [saved, setSaved] =
    useState(false)

  const [messageGenerated, setMessageGenerated] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  if (!foundPurchase) {
    return (
      <div className="details-page">
        <TopBar
          title="Purchase"
          onBack={() => navigate('/purchases')}
        />

        <p className="not-found">
          We couldn&apos;t find that purchase.
        </p>
      </div>
    )
  }

  // TypeScript now knows this can never be undefined.
  const purchase = foundPurchase

  function savePolicy() {
    const days = Number(policyDays)

    if (
      !Number.isFinite(days) ||
      days < 1 ||
      days > 365
    ) {
      return
    }

    const deadline = parsePurchaseDate(purchase.purchaseDate)
    if (!deadline) {
      alert('We could not read the purchase date. Please scan the invoice again before confirming a return deadline.')
      return
    }

    deadline.setDate(
      deadline.getDate() + days,
    )

    updatePurchase(
      purchase.id,
      {
        daysLeft: days,

        status:
          days <= 14
            ? 'soon'
            : 'safe',

        returnDeadline:
          deadline.toLocaleDateString(
            'en-IN',
            {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            },
          ),

        needsPolicyReview: false,

        reason:
          `Return deadline confirmed from the retailer's ${days}-day policy.`,
      },
    )
  }

  function saveFeedback() {
    updatePurchase(
      purchase.id,
      {
        returnReason,
        sellerFeedback,
      },
    )

    setSaved(true)

    window.setTimeout(
      () => setSaved(false),
      2400,
    )
  }

  const merchant = cleanMerchant(
    purchase.merchant,
  )

  const orderId = cleanOrderId(
    purchase.orderId,
  )

  const supportMessage = [
    `Hi${merchant ? ` ${merchant}` : ' Support Team'},`,
    '',
    `I would like to request a return for ${purchase.name}.`,

    purchase.purchaseDate
      ? `Purchased on: ${purchase.purchaseDate}`
      : '',

    orderId
      ? `Order ID: ${orderId}`
      : '',

    purchase.amount
      ? `Amount: ₹${purchase.amount.toLocaleString('en-IN')}`
      : '',

    '',
    `Reason: ${returnReason || 'Return request'}`,

    sellerFeedback
      ? `Details: ${sellerFeedback}`
      : '',

    '',
    'Please let me know the next steps for the return and refund.',

    '',
    'Thank you.',
  ].join('\n')

  function generateMessage() {
    updatePurchase(
      purchase.id,
      {
        returnReason,
        sellerFeedback,
      },
    )

    setMessageGenerated(true)
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(
        supportMessage,
      )

      setCopied(true)

      window.setTimeout(
        () => setCopied(false),
        2200,
      )
    } catch {
      alert(
        'Could not copy automatically. Select the message and copy it manually.',
      )
    }
  }

  function openEmail() {
    window.location.href =
      `mailto:?subject=${encodeURIComponent(
        `Return request — ${purchase.name}`,
      )}&body=${encodeURIComponent(
        supportMessage,
      )}`
  }

  function saveFreshScan() {
    addPurchase(freshScanResult)

    navigate(
      `/purchase/${freshScanResult.id}`,
    )
  }

  function removePurchase() {
    if (!window.confirm(`Delete “${purchase.name}”? This removes it from your purchase list.`)) return
    deletePurchase(purchase.id)
    navigate('/purchases')
  }

  return (
    <div className="details-page">

      <TopBar
        title={
          isFreshScan
            ? 'Purchase found'
            : purchase.name
        }
        onBack={() =>
          navigate('/purchases')
        }
      />

      <main className="details-content">

        {/* PURCHASE SUMMARY */}

        <section className="purchase-hero-card">

          <span className="details-label">
            PURCHASE TRACKER
          </span>

          <h1>
            {purchase.name}
          </h1>

          <div className="details-price">
            ₹
            {purchase.amount
              ? purchase.amount.toLocaleString('en-IN')
              : '—'}
          </div>

          <div className="details-dates">

            <div>
              <span>
                Purchased
              </span>

              <strong>
                {purchase.purchaseDate}
              </strong>
            </div>

            <div>
              <span>
                Return until
              </span>

              <strong>
                {purchase.returnDeadline}
              </strong>
            </div>

          </div>

          {purchase.needsPolicyReview ? (
            <div className="review-deadline">
              <AlertCircle size={17} />
              Deadline needs confirmation
            </div>
          ) : (
            <div
              className={`confirmed-deadline ${purchase.status}`}
            >
              {purchase.daysLeft} days left to return
            </div>
          )}

          {purchase.warrantyMonths > 0 && (
            <div className="warranty">
              <ShieldCheck size={16} />
              Warranty ·{' '}
              {purchase.warrantyMonths >= 12
                ? `${purchase.warrantyMonths / 12} year`
                : `${purchase.warrantyMonths} months`}
            </div>
          )}

          {!isFreshScan && <button className="delete-purchase" onClick={removePurchase}><Trash2 size={15} /> Delete this purchase</button>}

        </section>

        {/* RETURN POLICY */}

        {purchase.needsPolicyReview && (
          <section className="detail-card policy-card">

            <div className="card-title">

              <Store size={18} />

              <div>

                <h2>
                  Confirm the return policy
                </h2>

                <p>
                  Enter the policy shown by
                  the seller to start a reliable
                  deadline.
                </p>

              </div>

            </div>

            <div className="policy-form">

              <label>
                Days allowed for returns

                <input
                  value={policyDays}
                  onChange={(event) =>
                    setPolicyDays(
                      event.target.value,
                    )
                  }
                  inputMode="numeric"
                  type="number"
                  min="1"
                  max="365"
                />
              </label>

              <button
                onClick={savePolicy}
              >
                Set deadline
              </button>

            </div>

          </section>
        )}

        {/* RETURN REQUEST */}

        <section className="detail-card feedback-card">

          <div className="card-title">

            <MessageSquare size={18} />

            <div>

              <h2>
                Prepare a return request
              </h2>

              <p>
                Choose a reason, then create
                a message for the retailer’s
                official support channel.
              </p>

            </div>

          </div>

          {/* RETURN REASONS */}

          <div className="reason-chips">

            {returnReasons.map(
              (reason) => (
                <button
                  key={reason}
                  className={
                    returnReason === reason
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setReturnReason(
                      reason,
                    )
                  }
                >
                  {reason}
                </button>
              ),
            )}

          </div>

          {/* SELLER FEEDBACK */}

          <label className="feedback-label">

            Additional feedback

            <textarea
              value={sellerFeedback}
              onChange={(event) =>
                setSellerFeedback(
                  event.target.value,
                )
              }
              maxLength={280}
              placeholder="Tell the seller what could have been better…"
            />

          </label>

          <div className="feedback-footer">

            <span>
              {sellerFeedback.length}/280
            </span>

            <button
              onClick={saveFeedback}
            >
              {saved ? (
                <>
                  <Check size={16} />
                  Saved locally
                </>
              ) : (
                'Save draft'
              )}
            </button>

          </div>

          {/* GENERATE SUPPORT MESSAGE */}

          <div className="message-actions">

            <button
              className="generate-message"
              disabled={!returnReason}
              onClick={generateMessage}
            >
              Generate support message
            </button>

            <span>
              ReturnRight will never send
              it without your action.
            </span>

          </div>

          {/* GENERATED MESSAGE */}

          {messageGenerated && (
            <div className="support-message">

              <div className="support-message-title">

                <strong>
                  Your message is ready
                </strong>

                <span>
                  Review before sending
                </span>

              </div>

              <textarea
                readOnly
                value={supportMessage}
                aria-label="Generated support message"
              />

              <div className="support-message-actions">

                <button
                  onClick={copyMessage}
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy message
                    </>
                  )}
                </button>

                <button
                  onClick={openEmail}
                >
                  <Mail size={16} />
                  Open email
                </button>

              </div>

            </div>
          )}

        </section>

        {/* SOURCE */}

        {purchase.reason && (
          <section className="detail-card source-card">

            <span>
              WHY THIS DEADLINE
            </span>

            <p>
              {purchase.reason}
            </p>

            <small>
              Source: your uploaded invoice
              and the policy you confirmed.
            </small>

          </section>
        )}

      </main>

      {isFreshScan && (
        <div className="details-save">

          <button
            onClick={saveFreshScan}
          >
            Save to ReturnRight
          </button>

        </div>
      )}

    </div>
  )
}

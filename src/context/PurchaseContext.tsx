import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from 'react-oidc-context'
import type { Purchase } from '../types'
import { seedPurchases } from '../data/seed'
import { getReturnStatus } from '../utils/deadline'

interface PurchaseContextValue {
  purchases: Purchase[]
  atRisk: Purchase[]
  riskTotal: number
  addPurchase: (purchase: Purchase) => void
  addPurchases: (newPurchases: Purchase[]) => void
  updatePurchase: (id: string, updates: Partial<Purchase>) => void
  deletePurchase: (id: string) => void
  getPurchase: (id: string) => Purchase | undefined
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null)

const API_URL = import.meta.env.VITE_API_URL as string

function normalizePurchase(purchase: Purchase): Purchase {
  if (purchase.needsPolicyReview) return purchase
  const currentStatus = getReturnStatus(purchase.returnDeadline)
  return currentStatus ? { ...purchase, ...currentStatus } : purchase
}

function normalizePurchases(purchases: Purchase[]): Purchase[] {
  return purchases.map(normalizePurchase)
}

export function PurchaseProvider({
  children,
}: {
  children: ReactNode
}) {
  const auth = useAuth()

  // Cognito user information
  const userId = auth.user?.profile?.sub as string | undefined

  // IMPORTANT:
  // We send the ID token to API Gateway.
  // API Gateway validates it using the JWT authorizer.
  const idToken = auth.user?.id_token

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('returnright-purchases')

    if (!saved) {
      return normalizePurchases(seedPurchases)
    }

    try {
      return normalizePurchases(JSON.parse(saved) as Purchase[])
    } catch {
      return normalizePurchases(seedPurchases)
    }
  })

  // --------------------------------------------------
  // Save locally
  // --------------------------------------------------

  function persistLocal(next: Purchase[]) {
    const normalized = normalizePurchases(next)

    setPurchases(normalized)

    localStorage.setItem(
      'returnright-purchases',
      JSON.stringify(normalized),
    )
  }

  // --------------------------------------------------
  // Common API headers
  // --------------------------------------------------

  function getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(idToken
        ? {
            Authorization: `Bearer ${idToken}`,
          }
        : {}),
    }
  }

  // --------------------------------------------------
  // Save purchase to AWS
  // --------------------------------------------------

  async function savePurchaseToAPI(
    purchase: Purchase,
  ) {
    if (!API_URL || !idToken) {
      console.warn(
        'API or Cognito token not ready. Purchase saved locally only.',
      )
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/purchases`,
        {
          method: 'POST',
          headers: getHeaders(),

          // IMPORTANT:
          // No userId here.
          // Lambda gets userId from Cognito.
          body: JSON.stringify({
            purchase,
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()

        throw new Error(
          `API error ${response.status}: ${errorText}`,
        )
      }

      const data = await response.json()

      console.log(
        'Purchase saved to AWS:',
        data.purchase?.name ?? purchase.name,
      )
    } catch (error) {
      console.error(
        'Could not save purchase to AWS:',
        error,
      )
    }
  }

  // --------------------------------------------------
  // Load purchases from AWS
  // --------------------------------------------------

  useEffect(() => {
    if (!API_URL || !userId || !idToken) {
      return
    }

    async function loadPurchases() {
      try {
        const response = await fetch(
          `${API_URL}/purchases`,
          {
            method: 'GET',
            headers: getHeaders(),
          },
        )

        if (!response.ok) {
          const errorText = await response.text()

          throw new Error(
            `API error ${response.status}: ${errorText}`,
          )
        }

        const data = await response.json()

        if (Array.isArray(data.purchases)) {
          persistLocal(normalizePurchases(data.purchases))

          console.log(
            'Purchases loaded from AWS:',
            data.purchases.length,
          )
        }
      } catch (error) {
        console.warn(
          'Could not load purchases from AWS. Using local data.',
          error,
        )
      }
    }

    void loadPurchases()
  }, [userId, idToken])

  // --------------------------------------------------
  // Add one purchase
  // --------------------------------------------------

  function addPurchase(
    purchase: Purchase,
  ) {
    const next = [
      purchase,
      ...purchases.filter(
        (item) => item.id !== purchase.id,
      ),
    ]

    persistLocal(next)

    void savePurchaseToAPI(purchase)
  }

  // --------------------------------------------------
  // Add multiple purchases
  // --------------------------------------------------

  function addPurchases(
    newPurchases: Purchase[],
  ) {
    const ids = new Set(
      newPurchases.map(
        (item) => item.id,
      ),
    )

    const next = [
      ...newPurchases,
      ...purchases.filter(
        (item) => !ids.has(item.id),
      ),
    ]

    persistLocal(next)

    for (const purchase of newPurchases) {
      void savePurchaseToAPI(purchase)
    }
  }

  // --------------------------------------------------
  // Update purchase locally + AWS
  // --------------------------------------------------

  function updatePurchase(
    id: string,
    updates: Partial<Purchase>,
  ) {
    const next = purchases.map(
      (purchase) =>
        purchase.id === id
          ? {
              ...purchase,
              ...updates,
            }
          : purchase,
    )

    persistLocal(next)

    if (!userId || !idToken || !API_URL) {
      return
    }

    void updatePurchaseOnAPI(
      id,
      updates,
    )
  }

  // --------------------------------------------------
  // Update purchase on AWS
  // --------------------------------------------------

  async function updatePurchaseOnAPI(
    purchaseId: string,
    updates: Partial<Purchase>,
  ) {
    try {
      const response = await fetch(
        `${API_URL}/purchases`,
        {
          method: 'PUT',
          headers: getHeaders(),

          // IMPORTANT:
          // No userId here.
          // Lambda gets it from Cognito.
          body: JSON.stringify({
            purchaseId,
            updates,
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()

        throw new Error(
          `API error ${response.status}: ${errorText}`,
        )
      }

      console.log(
        'Purchase updated in AWS:',
        purchaseId,
      )
    } catch (error) {
      console.error(
        'Could not update purchase in AWS:',
        error,
      )
    }
  }

  // --------------------------------------------------
  // Delete purchase
  // --------------------------------------------------

  function deletePurchase(id: string) {
    const next = purchases.filter(
      (purchase) => purchase.id !== id,
    )

    persistLocal(next)

    /*
     * DELETE is not connected yet because
     * the current Lambda does not have a DELETE
     * handler.
     *
     * We will add that next.
     */
  }

  // --------------------------------------------------
  // Get purchase
  // --------------------------------------------------

  function getPurchase(
    id: string,
  ) {
    return purchases.find(
      (purchase) =>
        purchase.id === id,
    )
  }

  // --------------------------------------------------
  // Risk calculations
  // --------------------------------------------------

  const atRisk = useMemo(
    () =>
      purchases.filter(
        (purchase) => purchase.status === 'soon',
      ),
    [purchases],
  )

  const riskTotal = useMemo(
    () =>
      atRisk.reduce(
        (sum, purchase) =>
          sum + purchase.amount,
        0,
      ),
    [atRisk],
  )

  // --------------------------------------------------
  // Provider
  // --------------------------------------------------

  return (
    <PurchaseContext.Provider
      value={{
        purchases,
        atRisk,
        riskTotal,
        addPurchase,
        addPurchases,
        updatePurchase,
        deletePurchase,
        getPurchase,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  )
}

export function usePurchases() {
  const context =
    useContext(PurchaseContext)

  if (!context) {
    throw new Error(
      'usePurchases must be used within a PurchaseProvider',
    )
  }

  return context
}

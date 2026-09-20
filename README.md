# ReturnRight

A mobile-first web app that scans a receipt or invoice and turns it into a return/refund/warranty deadline you won't miss.

This is **Phase 1 — UI only**. No AWS is wired up yet; the scan flow uses demo data so it runs and demos reliably on its own.

## Run it

```bash
npm install
npm run dev
```

Open the local URL it prints. On your phone (same Wi-Fi), use the "Network" URL Vite prints instead of localhost so you can test the camera capture.

## Structure

```
src/
├── components/     TopBar, BottomNav — shared across pages
├── context/        PurchaseContext — in-memory purchase state, shared by Dashboard/Scan/PurchaseDetails
├── data/           Seed/demo purchases
├── pages/
│   ├── Login.tsx            Demo entry point (Cognito comes in Phase 2)
│   ├── Dashboard.tsx        Money-at-risk hero, scan/upload entry, expiring-soon list
│   ├── Scan.tsx             Camera capture (real device camera via capture="environment")
│   └── PurchaseDetails.tsx  Shows a fresh scan result (with Save) or an existing purchase
├── theme.ts        Design tokens (color, type)
└── types.ts        Purchase type
```

## What's next (Phase 2)

In `src/pages/Scan.tsx`, the `onFileChosen` handler has a `TODO` marking where the real pipeline replaces the demo timeout:

```
captured photo → S3 → Lambda → Textract → Bedrock → structured purchase → DynamoDB
```

Once that's wired, `PurchaseDetails` should receive the real extracted purchase instead of the `freshScanResult` demo object from `src/data/seed.ts`.
"# ReturnRight" 

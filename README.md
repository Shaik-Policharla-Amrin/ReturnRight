# ReturnRight

### Never lose money because you missed a return, refund, warranty, or cancellation deadline.

ReturnRight is a mobile-first web application that turns invoices and receipts into actionable purchase deadlines.

Students and families often miss return windows, refund follow-ups, warranty periods, and cancellation dates because important information is buried inside invoices, emails, and order confirmations.

**ReturnRight extracts the important information, tracks deadlines, and helps users take action before they lose money.**

---

## 🚀 Live Demo

https://main.dtjfzels7mmz4.amplifyapp.com
---

## ✨ Features

* 🔐 Secure user authentication with Amazon Cognito
* 📸 Upload invoice or receipt images
* ☁️ Private invoice storage using Amazon S3
* 🔎 OCR-based text extraction using amazon textract and Tesseract
* 🧠 Automatic extraction of purchase information
* 📅 Return deadline tracking
* 🛡️ Warranty tracking
* 💰 Purchase amount and merchant tracking
* ⚠️ Expiring-soon purchase alerts
* 📝 Return/support message generation
* 🗂️ Persistent purchase history using DynamoDB
* 🔄 REST API using Amazon API Gateway
* 🔔 Automated daily deadline checking using EventBridge Scheduler
* 📱 Mobile-first responsive interface

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      ReturnRight     │
                    │   React + TypeScript │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          Amazon Cognito   Amazon S3     API Gateway
          Authentication   Invoice       REST API
                           Storage           │
                                            ▼
                                   ReturnRight Lambda
                                            │
                                            ▼
                                     Amazon DynamoDB
                                            │
                                            │
                         ┌──────────────────┘
                         ▼
                EventBridge Scheduler
                         │
                         ▼
                ReturnRightReminders
                         │
                         ▼
                 Deadline Checking
```

---

## 🔄 How ReturnRight Works

### 1. Sign in

Users securely sign in through **Amazon Cognito**.

### 2. Upload a purchase document

The user uploads an invoice, receipt, or order confirmation.

### 3. Store securely

The uploaded document is stored in a private **Amazon S3** bucket.

### 4. Extract text
Amazon Textract is used as the primary OCR service for extracting text from uploaded invoices, with Tesseract.js as a local fallback.

### 5. Understand the purchase

The extracted information is converted into structured purchase data such as:

```json
{
  "product": "On-Ear Headphones",
  "amount": 1798,
  "purchaseDate": "2026-09-12",
  "returnDeadline": "2026-09-19",
  "warrantyMonths": 0,
  "merchant": "Appario Retail Private Ltd"
}
```

### 6. Save the purchase

Purchase information is persisted in **Amazon DynamoDB**.

### 7. Track deadlines

ReturnRight calculates how much time remains before an important deadline.

### 8. Remind the user

**Amazon EventBridge Scheduler** triggers the reminder Lambda every day to check purchases approaching their return deadlines.

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* Lucide React

### AWS

* **Amazon Cognito** — authentication
* **Amazon S3** — private invoice storage
* **AWS Lambda** — serverless backend processing
* **Amazon API Gateway** — REST API
* **Amazon DynamoDB** — purchase database
* **Amazon EventBridge Scheduler** — automated reminder checks
* **AWS Amplify** — application hosting

### OCR

* Tesseract OCR

---

## 🔐 Security

ReturnRight is designed with privacy and user-specific data access in mind.

* User authentication is handled through Amazon Cognito.
* Invoice files are stored in a private S3 bucket.
* S3 access is restricted to authenticated users.
* API requests use Cognito authentication.
* Purchase records are stored in DynamoDB.
* User purchase data is associated with the authenticated user.

ReturnRight does not automatically send messages to sellers. Users review generated support messages before taking action.

---

## 📂 Project St

# Antigravity Agent Spec: ID Card Issuing System

## 1. Role & Objective
You are an expert full-stack developer. Your task is to build a complete B2B web application for a printing shop that issues ID cards for client organizations (e.g., hospitals). 
You will scaffold a Next.js (App Router) application, implement the UI with Tailwind CSS, and integrate a serverless backend using Vercel built-in API routes.

## 2. Tech Stack & Infrastructure
- **Framework:** Next.js (App Router, React, TypeScript).
- **Styling:** Tailwind CSS + shadcn/ui (or standard Tailwind components for speed).
- **Authentication:** Firebase Auth (Email/Password).
- **Database:** Google Sheets API (using `googleapis` library and a Service Account).
- **Storage:** Vercel Blob (`@vercel/blob`) for employee photo uploads.
- **QR Code Generation:** `qrcode.react` (or similar lightweight library).
- **Deployment Target:** Vercel.

## 3. Database Schema (Google Sheets)
Assume a single Google Sheet with the following columns (Row 1 is headers):
- `Application_ID` (UUID)
- `Org_ID` (String, e.g., "GH-2026")
- `Timestamp` (ISO String)
- `Employee_Name` (String)
- `Role` (String)
- `Blood_Group` (String)
- `Photo_URL` (String - Vercel Blob URL)
- `Status` (Enum: "Pending", "Printing", "Ready", "Rejected")

## 4. Application Routes & Features

### A. Public Facing: Employee Application Form (`/apply`)
- **Trigger:** Employees reach this URL via scanning a QR code (e.g., `/apply?org=GH-2026`).
- **UI:** Mobile-optimized form requesting Name, Role, Blood Group, and a file input for a photo.
- **Logic:** 
  1. Uploads the image to Vercel Blob via an API route.
  2. Submits the form data + Blob URL to a Next.js API route that appends a row to Google Sheets.
  3. Shows a success screen.

### B. Authentication (`/login`)
- Simple email/password login using Firebase Authentication.
- Route protection based on user roles (Shop Admin vs. Client Admin). For now, use hardcoded email checks or Firebase custom claims to distinguish between the Shop Admin and Client Admins.

### C. Client Admin Dashboard (`/client-dashboard`)
- **Access:** Protected route for hospital/org admins.
- **UI:** A read-only data table fetching data from the Google Sheet API where `Org_ID` matches the logged-in client's assigned organization ID.
- **Data:** Shows Employee Name, Role, Photo (thumbnail), and Status.

### D. Shop Admin Dashboard (`/shop-dashboard`)
- **Access:** Protected route for the printing shop staff.
- **Features:**
  1. View a data table of *all* applications across all organizations.
  2. Filter by `Org_ID` or `Status`.
  3. **QR Generator:** An input field to type an Organization Name/ID, generating a downloadable QR code linking to `/apply?org=[ID]`.
  4. **Status Updater:** Dropdowns in the data table to change an application's status (triggers an API route that updates the specific cell in Google Sheets).

## 5. Execution Plan for Antigravity

Please execute the following steps sequentially. Wait for my confirmation or prompt me if you need API keys, but scaffold the code first assuming they will be loaded via `.env.local`.

**Step 1: Scaffolding**
- Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in the current directory.
- Install necessary dependencies: `firebase`, `@vercel/blob`, `googleapis`, `qrcode.react`, `lucide-react`, `uuid`.

**Step 2: Utility & API Setup**
- Create `src/lib/firebase.ts` to initialize Firebase Auth.
- Create `src/lib/googleSheets.ts` to configure the `googleapis` client using a Service Account JSON from env variables.
- Create Next.js API routes:
  - `POST /api/upload` (Handles Vercel Blob photo upload).
  - `POST /api/applications` (Appends row to Sheets).
  - `GET /api/applications` (Fetches rows, filters by org if provided).
  - `PATCH /api/applications` (Updates status in Sheets).

**Step 3: Frontend Implementation**
- Build the `/apply` form with loading states and error handling.
- Build the `/login` page.
- Build the Dashboard layouts and data tables.

**Step 4: Linting & Testing**
- Run your built-in linter and ensure there are no TypeScript errors.
- Ensure all API routes validate inputs and handle Google Sheets rate limits/errors gracefully.

**Rules for this session:**
- Do not use any raw shell execution tools to bypass package managers; strictly use `npm` or `yarn`.
- Use clean, modern functional React components.
- Modularize your code—keep API logic out of UI components.
- Ask me for the `.env.local` variable names before attempting to test the API routes.
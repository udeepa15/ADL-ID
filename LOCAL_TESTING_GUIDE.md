# Local Testing Guide for ID Card Issuing System

This guide outlines the complete setup required to test the ID Card Issuing System locally. Because the system relies on external services (Firebase, Google Sheets, Vercel Blob), you must configure these services first.

## Prerequisites
- Node.js (v18+)
- A Firebase Project
- A Google Cloud Project (with Google Sheets API enabled)
- A Vercel Account

---

## Step 1: Set Up Environment Variables

Create a file named `.env.local` in the root of your project (`c:\Users\ASUS\Desktop\ADL\ADL-ID\.env.local`) and paste the following template:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project_id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"

# Google Sheets Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL="your_service_account_email@your_project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="your_google_sheet_id"

# Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token_here"

# Comma-separated list of shop admin login emails (server-side only)
SHOP_ADMIN_EMAILS="you@yourshop.com"
```

> Roles are decided on the server. Shop admins are the emails in `SHOP_ADMIN_EMAILS`.
> Client admins are the `Client_Email` assigned to an organization in the `_Organizations_` tab.
> Any other Firebase account is signed out with "not granted access".

---

## Step 2: Google Sheets API Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Enable the **Google Sheets API**.
3. Navigate to **IAM & Admin > Service Accounts** and create a service account.
4. Generate a **JSON Key** for the service account and download it.
5. Extract the `client_email` and `private_key` from the JSON file and paste them into your `.env.local`.
6. Create a new Google Sheet and add the following headers in **Row 1**, from A to H:
   `Application_ID` | `Org_ID` | `Timestamp` | `Employee_Name` | `Role` | `Blood_Group` | `Photo_URL` | `Status`
7. **Crucial:** Click "Share" on your Google Sheet and invite the `client_email` (Service Account Email) as an **Editor**.
8. Copy the Sheet ID from the URL (e.g., `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`) and paste it into `.env.local` under `GOOGLE_SHEET_ID`.

---

## Step 3: Firebase Authentication Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Under **Build > Authentication**, click **Get Started** and enable the **Email/Password** sign-in method.
3. Under **Project Settings > General**, add a Web App and copy the Firebase configuration values into your `.env.local`.
4. Go back to Authentication > Users and **Add user** to create your shop admin account (use a strong password). Put that email in `SHOP_ADMIN_EMAILS`.
   - Don't create client accounts by hand. The shop dashboard's **Create Organization** form creates the client login and shows its generated password once.

---

## Step 4: Vercel Blob Setup
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and create a new project (you can link it to a dummy GitHub repo or push this one).
2. Go to the **Storage** tab and create a new **Vercel Blob** store (you can select Public or Private access).
3. Once created, Vercel will give you a `.env.local` snippet with your `BLOB_READ_WRITE_TOKEN`.
4. Copy this token into your `.env.local` file.
*(Note: The upload API route automatically handles both Public and Private Vercel Blob stores).*

---

## Step 5: Start the Local Development Server
Open your terminal in the project directory and run:

```bash
npm install
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## Step 6: Testing the Workflows

### 1. Test the Shop Admin Dashboard
1. Navigate to `http://localhost:3000/login`.
2. Login with your `shopadmin@example.com` account.
3. You will be redirected to `/shop-dashboard`.
4. Create an organization: enter an Organization ID (e.g. `GH-2026`) and a client admin email, then submit. Copy the generated password and download the QR code from the dialog.

### 2. Test the Application Form
1. Open a new incognito window or log out.
2. Navigate to `http://localhost:3000/apply?org=GH-2026`.
3. Fill out the form fields (Name, Role, Blood Group) and select a photo to upload.
4. Submit the form. Wait for the success screen.
5. **Verify:** Check your Google Sheet to confirm a new row was added with the Vercel Blob URL!

### 3. Test the Client Dashboard
1. Navigate back to `http://localhost:3000/login`.
2. Login with the client email and generated password from the Create Organization dialog.
3. You will be redirected to `/client-dashboard` and should see the application you just submitted.

### 4. Test Status Updates
1. Login as the Shop Admin again (`/shop-dashboard`).
2. Find the pending application in the table.
3. Change the status dropdown from "Pending" to "Printing".
4. **Verify:** Check the Google Sheet; the Status column should update automatically.

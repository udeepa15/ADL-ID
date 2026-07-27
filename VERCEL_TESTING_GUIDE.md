# Vercel Deployment & Testing Guide

This guide details how to deploy the **ID Card Issuing System** to Vercel and test the production deployment.

---

## Step 1: Deploy to Vercel

### Option A: Via GitHub (Recommended)
1. Push your latest code changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Fix blob upload fallback & prepare for production"
   git push origin main
   ```
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **Add New...** > **Project** and import your GitHub repository.

### Option B: Via Vercel CLI
1. Run the following command in your project directory:
   ```bash
   npx vercel
   ```
2. Follow the interactive prompts to link and deploy your project.

---

## Step 2: Configure Environment Variables on Vercel

In your Vercel Project Dashboard:
1. Navigate to **Settings** > **Environment Variables**.
2. Add all environment variables from your `.env.local` file:

| Key | Description |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account Email |
| `GOOGLE_PRIVATE_KEY` | Private Key (paste the entire `-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----` string including quotes or raw formatting) |
| `GOOGLE_SHEET_ID` | Google Sheet ID |

> [!NOTE]
> `BLOB_READ_WRITE_TOKEN` will automatically be populated if you link your Vercel Blob store in Step 3.

---

## Step 3: Attach Vercel Blob Storage

1. In your Vercel project dashboard, click the **Storage** tab.
2. Click **Connect Store** or **Create Store**, and select **Blob**.
3. Choose your store (Public or Private) and connect it to your production environment.
4. Vercel will automatically inject `BLOB_READ_WRITE_TOKEN` into your project environment variables.

---

## Step 4: Add Vercel Domain to Firebase Authorized Domains (CRITICAL)

For Firebase Authentication to allow users to log in on your live Vercel domain:

1. Copy your Vercel deployment URL (e.g., `https://your-app-name.vercel.app`).
2. Go to the [Firebase Console](https://console.firebase.google.com/).
3. Select your project and navigate to **Build** > **Authentication** > **Settings** tab.
4. Click **Authorized domains**.
5. Click **Add domain** and enter your Vercel domain (e.g. `your-app-name.vercel.app`).

---

## Step 5: Test the Live Production Application

Once the deployment finishes and your domain is active:

### 1. Test Shop Admin Login & Dashboard
1. Open `https://your-app-name.vercel.app/login`.
2. Sign in using `shopadmin@example.com`.
3. Verify redirection to `/shop-dashboard`.
4. Test generating and downloading a QR Code for Org `GH-2026`.

### 2. Test Live Photo Upload & Application Form
1. Open `https://your-app-name.vercel.app/apply?org=GH-2026` (in Incognito mode or logged out).
2. Fill in Name, Role, Blood Group, and attach a photo.
3. Submit the form.
4. Verify success response.
5. Check your Google Sheet to verify the newly added row and the Vercel Blob `Photo_URL`.

### 3. Test Client Dashboard
1. Sign in at `https://your-app-name.vercel.app/login` using `clientgh@example.com`.
2. Verify redirection to `/client-dashboard` and confirm the submitted application displays.

### 4. Test Status Sync
1. Log back in as `shopadmin@example.com` at `/shop-dashboard`.
2. Update the status of the submitted application (e.g. change to "Printing").
3. Verify the status updates in Google Sheets and on the Client Dashboard.

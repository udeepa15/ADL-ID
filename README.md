# ADL ID Pass

A web app for a print shop that issues ID cards to client organizations (for example, hospitals).

- **Employees** scan an organization's QR code and fill in `/apply?org=<ORG_ID>` with their details and a photo.
- **Client admins** sign in and see their own organization's applications at `/client-dashboard`.
- **Shop admins** create organizations (each gets its own Google Sheets tab, custom form fields and a client login), generate QR codes, and move applications through `Pending → Printing → Ready / Rejected` at `/shop-dashboard`.

**Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Firebase Auth, Google Sheets (as the database), Vercel Blob (photos).

## Getting started

```bash
npm install
npm run dev
```

Before you run it, set up the external services and `.env.local` as described in [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md). For deployment, see [VERCEL_TESTING_GUIDE.md](VERCEL_TESTING_GUIDE.md).

## Access control

Every protected API route checks the caller's Firebase ID token on the server (`src/lib/serverAuth.ts`). The UI's redirects are only for convenience.

| Route | Who can call it |
| --- | --- |
| `POST /api/upload` | Public (JPEG/PNG/WebP, max 4 MB) |
| `POST /api/applications` | Public, but only for organizations that already exist |
| `GET /api/organizations?orgId=X` | Public (returns only the form's custom fields) |
| `GET /api/applications` | Shop admins (all orgs); client admins (their own org only) |
| `PATCH /api/applications` | Shop admins |
| `GET /api/organizations`, `POST /api/organizations` | Shop admins |
| `GET /api/me` | Any signed-in user with a role |

Roles:
- **Shop admin:** the email is listed in `SHOP_ADMIN_EMAILS`.
- **Client admin:** the email is an organization's `Client_Email` in the `_Organizations_` tab.

# RoughCUT

Multi-tenant SaaS for electrical contractors. A foreman specs every box on a job once (type, size, height, circuit, notes, photo) and sticks a unique label on it; anyone scans the sticker later to see the spec. Shops subscribe; sticker printing is a convenience add-on.

Monorepo: `apps/web` (Next.js 15 — marketing, company app, super admin, Stripe webhook), `apps/mobile` (Expo — the foreman/installer app), `packages/shared` (shared TypeScript types), `supabase/` (SQL migrations + seed script).

See **DECISIONS.md** for every place an unspecified detail in the build spec was resolved, and why.

## Stack

- **Mobile**: Expo SDK 54, React Native, TypeScript, Expo Router, expo-camera/sqlite/image-picker/secure-store/linking.
- **Web**: Next.js 15 App Router, TypeScript, Tailwind.
- **Backend**: Supabase (Auth, Postgres, Storage, Row-Level Security). One project, shared by web and mobile.
- **Billing**: Stripe Checkout + Customer Portal + webhooks.
- **Print**: Diginate API when a key is configured; otherwise a self-printable PDF.

## Prerequisites

- Node 20+, npm.
- A Supabase project (free tier is fine to start).
- Stripe account in test mode, with two recurring Prices created (Crew $49/mo, Company $149/mo).
- Expo account + the Expo Go app, or Xcode/Android Studio, to run the mobile app.
- A Diginate account + API key — optional; without it, sticker orders fall back to a downloadable PDF.

## 1. Install

```
npm install
```

This installs all three workspaces (`apps/web`, `apps/mobile`, `packages/shared`) from the repo root.

## 2. Configure environment

```
cp .env.example .env
```

Fill in every variable — see the comments in `.env.example` for what each one is and where it comes from. In short:

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Supabase project settings → API. Safe to ship to the browser. |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | Same values, Expo's own env var naming convention. |
| `SUPABASE_SERVICE_ROLE_KEY` | Web (server only) | Bypasses RLS. Never ship to mobile, never expose to the browser. |
| `WEB_ORIGIN` / `NEXT_PUBLIC_WEB_ORIGIN` | Web | Used to build the QR payload: `{WEB_ORIGIN}/b/{public_code}`. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Web (server only) | From the Stripe dashboard / `stripe listen`. |
| `STRIPE_PRICE_CREW` / `STRIPE_PRICE_COMPANY` | Web | The two paid Price IDs. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web | Stripe's publishable key. |
| `DIGINATE_API_KEY` | Web (server only) | Optional — omit to always use the PDF fallback. |
| `PLATFORM_OWNER_EMAIL` / `PLATFORM_OWNER_PASSWORD` | Seed script | The one owner account, seeded directly (never a signup). |
| `SUPABASE_BOX_PHOTOS_BUCKET` | Web/mobile | Defaults to `box-photos`; only change if you renamed the bucket. |

For mobile builds via EAS, also set `WEB_ORIGIN_HOST` (just the hostname, e.g. `app.roughcut.com`) as an EAS env var — it drives the universal-link config in `apps/mobile/app.config.ts`. See the Mobile section below.

## 3. Set up the database

In the Supabase SQL editor (or via the Supabase CLI), run every file in `supabase/migrations/` **in order** (`0001_...` through `0007_...`). They create the schema, RLS policies, triggers, and storage buckets.

Then seed demo data:

```
npm run seed
```

This creates the platform owner (from `.env`), a demo company on the Crew plan, one admin/foreman/installer (password printed to the console), one open job, five specified boxes, and one sticker order already in `ready_for_manual_print`. Safe to re-run — it looks up existing users by email instead of failing.

## 4. Run the web app

```
npm run dev:web
```

Visit `http://localhost:3000`. In a second terminal, forward Stripe webhooks to your local server:

```
npm run stripe:listen
```

(Requires the [Stripe CLI](https://stripe.com/docs/stripe-cli) installed and logged in separately — this isn't an npm package.)

- `/signup`, `/login`, `/pricing` — public.
- `/app/*` — company app (jobs, team, stickers, billing), once logged in as a company user.
- `/admin/login` then `/admin/companies` — platform owner console.

## 5. Run the mobile app

```
npm run dev:mobile
```

Scan the QR code with Expo Go (iOS/Android), or press `i`/`a` for a simulator. Log in with a foreman/installer account from the seed output.

**Before an EAS build for real devices / store submission:**

1. Set real, registered bundle identifiers in `apps/mobile/app.config.ts` (currently placeholders: `com.roughcut.app`).
2. Set `WEB_ORIGIN_HOST` in your EAS project's environment to your real deployed web domain.
3. Serve `https://<your domain>/.well-known/apple-app-site-association` and `.../.well-known/assetlinks.json` from the web app (not included in this build — needed for universal links to actually open the app) with content pointing at your app's team/bundle IDs.
4. `eas build --platform ios` / `--platform android`.

## Deploying the web app

Assumed target: Vercel.

1. Import the repo, set the **root directory** to `apps/web`.
2. Add every web-relevant env var from `.env` to the Vercel project (Production + Preview).
3. Set the Stripe webhook endpoint (in the Stripe dashboard) to `https://<your domain>/api/stripe/webhook`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Deploy.

## Project structure

```
apps/web/        Next.js 15 app — marketing, auth, company app, super admin, Stripe webhook, print pipeline
apps/mobile/      Expo app — login, jobs, scan, spec form/card, offline sync
packages/shared/  Shared TypeScript types/enums/plan limits, hand-written against the SQL schema
supabase/migrations/  SQL migrations, run in order
supabase/seed/        Seed script (npm run seed)
DECISIONS.md          Every unspecified-detail choice made while building this, and why
```

## Acceptance checklist (from the build spec)

- [ ] Signup, free plan, and paid Checkout work against Stripe test mode.
- [ ] Invite creates a foreman who can log in on mobile.
- [ ] Foreman saves a spec with a photo while offline; it syncs later.
- [ ] Installer scans the same code and marks installed; that status does not revert.
- [ ] A second company cannot read the first company's rows under the anon key.
- [ ] Sticker order downloads a PDF, and uses Diginate only when the key exists.
- [ ] Owner can list companies and see Stripe status.
- [ ] `npm run typecheck` passes.

The schema/RLS/triggers, Stripe flow, print pipeline, and mobile offline queue are all built to satisfy these; running through them end-to-end against a real Supabase + Stripe test project is the last manual verification step, since it needs real credentials this environment doesn't have.

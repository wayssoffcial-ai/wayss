# WAYS S — Full-stack starter

A React + TypeScript + Supabase social app starter using the WAYS S visual identity and Quick Center navigation.

## Included

- Email/password signup and sign-in; Google OAuth hook (requires provider setup)
- Profile creation, profile editing, avatar and cover uploads
- Public/private profile toggle
- Custom profile sections with per-section colour and links
- Quick Center: collapsed W logo, expanding glass nav, 2.6s auto-collapse, create menu
- Create Post / Images / Flux uploads (image/video)
- Feed, likes, comments
- Orbit people search and follow/unfollow
- Basic one-to-one messaging with Supabase Realtime subscription
- Responsive dark glassmorphism UI

## Important status

This is a runnable full-stack **MVP foundation**, not a finished production social network. It requires your own Supabase project and configuration. The UI includes working core flows, but advanced production features such as moderation queues, robust private-account approval requests, message inbox discovery, push notifications, rate limiting, media transcoding, admin tooling, and full security review still need implementation before public launch.

## Requirements

- Node.js 20+
- npm
- A Supabase account/project

## Setup

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase and run all of `supabase/schema.sql`.
3. In Supabase **Project Settings → API**, copy the Project URL and anon/public key.
4. Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

5. Install and run:

```bash
npm install
npm run dev
```

6. Open the local URL shown by Vite, normally `http://localhost:5173`.

## Google sign-in

In Supabase → Authentication → Providers → Google, enable Google and add your Google OAuth Client ID/Secret. Add your local and production callback URLs in Google Cloud and Supabase URL configuration. The Google button is wired to Supabase OAuth.

## Deploy

Build with `npm run build`, then deploy `dist/` to Vercel, Netlify, Cloudflare Pages, or another static host. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables to the hosting provider. Add the deployed domain to Supabase Auth URL configuration.

## Security notes before launch

- Never put a Supabase `service_role` key in frontend code.
- Review and test every RLS policy against your privacy requirements.
- The sample profile select policy is broad for authenticated users; the private profile content rules are enforced for posts and sections, but profile metadata visibility may need tightening.
- Add rate limits, spam protection, abuse reporting workflows, account deletion, email verification policy, and moderation tools.
- The sample media bucket is public for easy MVP previews. For sensitive/private media, use private storage buckets and signed URLs.
- Configure email templates, SMTP, OAuth redirect URLs, backups, and production monitoring.

## Folder structure

```text
src/
  components/    QuickCenter, PostCard
  lib/           Supabase client and data helpers
  pages/          Auth, Home, Orbit, Create, Profile, Messages, Settings
  App.tsx
  styles.css
supabase/
  schema.sql
```

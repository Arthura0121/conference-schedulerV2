# English Conferences

Students reserve writing conferences and teachers manage appointments, access, rosters, and site themes.

## Local development

Use Node.js 22.12 or later. Copy `.env.example` to `.env` and use the URL and public browser key for your test project. See the [setup guide](SETUP.md) for database and deployment steps.

```sh
npm ci
npm run verify
npm run dev
```

Open the URL Vite prints. Add `#admin` for the teacher sign-in.

## Verification and release notes

- [Testing](TESTING.md) covers the mocked browser suite and separate database checks.
- [Changelog](CHANGELOG.md) mirrors the latest release in **What’s New**. The displayed version comes from `package.json`.
- [Roster privacy](PRIVACY.md), [live updates](REALTIME.md), and [viewer counts](VISITOR_COUNT.md) explain what the app shares.

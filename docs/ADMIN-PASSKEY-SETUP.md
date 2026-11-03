# Yehulu Digital — Admin Passkey Setup

The admin sign-in uses WebAuthn passkeys. The owner registers a device once, then signs in by swiping and completing the device's fingerprint, face, Windows Hello, or screen-lock verification prompt.

## One-time first-device setup

1. Open the Vercel project **yehulu-digital** and go to **Settings → Environment Variables**.
2. Add `ADMIN_PASSKEY_SETUP_TOKEN` as a **Sensitive** variable for **Production** only.
3. Use a high-entropy, one-time value generated for the owner. Do not commit it to GitHub or place it in frontend source code.
4. Redeploy the latest production commit so the serverless function receives the new variable.
5. Open the production URL in the owner's browser using the one-time fragment URL:
   `https://yehulu-digital.vercel.app/admin/login#setup=<one-time-token>`
6. Select **Verify and register this device**, then complete the browser's device-verification prompt.

The setup token is sent only in the request body after the page reads it from the URL fragment. The API records completion in the private CMS Blob store. Once the first passkey is saved, the setup token is no longer accepted.

## After enrollment

- The owner signs in from `/admin/login` by swiping and verifying with the registered passkey.
- Password-based admin sign-in returns HTTP 410 once a passkey exists.
- The existing admin API session remains protected and continues to use the signed admin session token.
- Keep the private CMS Blob store connected; passkey credentials and challenges are stored there.
- The production relying-party ID and origin default to `yehulu-digital.vercel.app`. Use the canonical production domain, not a temporary Vercel preview hostname.
- The one-time setup variable can be deleted from Vercel after enrollment.

If a passkey is lost, do not make registration public. Recover access through a controlled owner-only device re-enrollment process.

# Yehulu Digital client portal setup

The client portal is served at:

`https://yehulu-digital.vercel.app/client-portal`

It uses the same server-side session system as the existing administrator dashboard. The username is configured as `mihreteab`; the password is never stored in the public repository.

## 1. Connect storage

The portal needs persistent storage because Vercel Functions do not retain writes to the local project filesystem.

In the Vercel project **yehulu-digital**:

1. Open **Storage** and connect the existing public Blob store `yehulu-digital-blob` to the project for uploaded portfolio images. Its read/write token must be available to the project as `BLOB_READ_WRITE_TOKEN`.
2. Create and connect a second Blob store with **Private** access, named `yehulu-digital-private-cms`.
3. Add that private store's read/write token as the sensitive environment variable `CMS_BLOB_READ_WRITE_TOKEN`. Keep it separate from the public media store token.

The private store holds administrator records, industries, sub-industries, organizations, and social profile links. Do not use the public media-store token for this variable.

## 2. Configure the initial login

From the repository root, run:

```bash
npm run admin:secrets
```

Enter the initial password when prompted. The script prints a salted scrypt password hash and a random session secret. Add the printed values to **Vercel → Project → Settings → Environment Variables**:

- `ADMIN_USERNAME` = `mihreteab`
- `ADMIN_PASSWORD_HASH` = the generated scrypt hash (Sensitive)
- `SESSION_SECRET` = the generated random secret (Sensitive)
- `CMS_BLOB_READ_WRITE_TOKEN` = the read/write token from the private CMS Blob store (Sensitive)

Apply them to Production and Preview. Also confirm `BLOB_READ_WRITE_TOKEN` is present for the connected public media store.

The requested initial password can be entered into the generator prompt. It is deliberately not written into source code, a committed file, or the browser.

## 3. Deploy and sign in

Redeploy the Vercel project after adding the environment variables, then open `/client-portal`.

The portal workflow is:

1. Create an industry.
2. Add sub-industries inside that industry.
3. Create organizations under the industry and attach their website and social media profiles.
4. Upload portfolio images and assign each image to an industry, sub-industry, and organization.

Hosted image uploads are limited to 4 MB per image. Use optimized JPG, PNG, or WEBP images for the best upload experience.

## 4. Change the temporary password

The existing administrator account page at `/admin/account` supports changing the account password. Change the temporary initial password immediately after first sign-in to a unique password of at least 12 characters.

## Local development

For local development, add `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and a `SESSION_SECRET` to your untracked `.env` file. The local server can persist CMS records in `data/`. Never commit `.env` or any Blob read/write token.

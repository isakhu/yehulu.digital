# Yehulu Digital — Owner Admin Login

The owner signs in from:

`https://yehulu-digital.vercel.app/admin/login`

The login page asks for **one password only**. It does not require a username, email address, passkey, or registration.

## Vercel environment

In the Vercel project **yehulu-digital**, keep these variables configured:

- `ADMIN_PASSWORD`: the owner's password. Store it as a **Sensitive** environment variable; never commit it to Git.
- `SESSION_SECRET`: a random secret with at least 32 characters, also stored as **Sensitive**.
- `CMS_BLOB_STORE_ID`: keep the connected private CMS store so project and video records persist.
- `BLOB_READ_WRITE_TOKEN`: keep the media Blob token connected when the project uses Blob uploads.

After changing environment variables, redeploy the project so the deployment receives the new values.

## Owner content management

After signing in, use the existing dashboard:

- **Gallery Items**: create, edit, and delete projects; upload image files or paste an image URL; set the project title, category, description, and display order.
- **Video Portfolio**: create, edit, and delete video entries; upload a video or paste a video URL (for example, a YouTube link); add a thumbnail and details.
- Existing public project and video pages continue to read from the same CMS APIs.

Vercel-hosted direct uploads currently have a 4 MB file limit. For larger videos, use a hosted video link.

## Security

The server validates the password and issues the existing signed administrator session token. Login attempts are rate-limited. The dashboard APIs remain protected and the public website layout is unchanged.

The requested six-digit password is easy to guess. Change it to a unique password as soon as the owner is comfortable doing so.

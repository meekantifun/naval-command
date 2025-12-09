# Configuration Folder

## Google Sheets Integration

Place your Google Cloud service account credentials here:

```
config/google-credentials.json
```

### How to Get Credentials:

1. Go to https://console.cloud.google.com/
2. Create a project and enable Google Sheets API
3. Create a Service Account
4. Generate JSON key
5. Save it here as `google-credentials.json`

### File Structure:

The credentials file should look like:
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

### Important:

- **DO NOT commit this file to Git**
- Share sheets with the `client_email` from this file
- Keep this file secure

See `SETUP_GOOGLE_SHEETS.md` in the root directory for full setup instructions.

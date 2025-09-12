# DigitalOcean App Platform Environment Variables Setup

## Required Environment Variables for Backend Service

These environment variables must be added to your DigitalOcean App Platform backend service configuration:

### Core Database Configuration
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Authentication & Security
```
JWT_SECRET=your_jwt_secret_key_min_32_chars
EMAIL_ENCRYPTION_KEY=your_32_char_encryption_key_here
```

### Google OAuth2 (for Gmail integration)
```
GOOGLE_OAUTH2_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH2_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH2_REDIRECT_URI=https://your-app-name.ondigitalocean.app/api/oauth2/auth/callback
```

### Optional - Microsoft OAuth2 (for Outlook)
```
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://your-app-name.ondigitalocean.app/api/oauth2/microsoft/callback
```

### Optional - SMTP Configuration
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@gmail.com
SMTP_PASS=your-app-password
```

### Environment Settings (Already configured in app.yaml)
```
NODE_ENV=production
PORT=4000
```

## Required Environment Variables for Frontend Service

### API Configuration (Already configured in app.yaml)
```
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=${backend.PUBLIC_URL}
```

## How to Add Environment Variables in DigitalOcean

1. **Via DigitalOcean Console:**
   - Go to your App in DigitalOcean Console
   - Click on your backend service component
   - Go to "Settings" tab
   - Scroll to "Environment Variables" section
   - Click "Edit"
   - Add each variable with its value
   - Click "Save"

2. **Via doctl CLI:**
   ```bash
   doctl apps update YOUR_APP_ID --spec app.yaml
   ```

3. **Via API:**
   Use the DigitalOcean API to update app spec with environment variables

## Getting Your Supabase Credentials

1. **SUPABASE_URL:**
   - Go to your Supabase project dashboard
   - Settings → API
   - Copy the "Project URL"
   - Format: `https://YOUR_PROJECT_ID.supabase.co`

2. **SUPABASE_SERVICE_KEY:**
   - Go to your Supabase project dashboard
   - Settings → API
   - Copy the "service_role" key (NOT the anon key)
   - This key has admin privileges - keep it secure!

## Security Notes

- Never commit these values to your repository
- Use DigitalOcean's environment variable encryption
- Rotate keys regularly
- Use different keys for development and production

## Verifying Configuration

After adding environment variables:

1. Redeploy your app
2. Check the build logs for any missing variable errors
3. Test the health endpoint: `https://your-app.ondigitalocean.app/health`
4. Check application logs for successful Supabase connection

## Troubleshooting

If you see "Missing supabaseUrl configuration" error:
- Ensure SUPABASE_URL is set correctly (no trailing slash)
- Check that the service key is the service_role key, not anon key
- Verify the environment variables are applied to the correct service (backend)
- Trigger a new deployment after adding variables
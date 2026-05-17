# Netlify Deployment Guide

This guide will help you deploy the PetCare application to Netlify using serverless functions.

## Prerequisites

- A Netlify account (sign up at https://netlify.com)
- A PostgreSQL database (you can use services like Neon, Supabase, or Railway)
- Node.js 20 LTS and npm 10+

## Setting Up Neon PostgreSQL

Neon is a serverless PostgreSQL database that works great with Netlify. Here's how to set it up:

### 1. Create a Neon Account

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Sign up with GitHub, Google, or email (free tier includes 0.5 GB storage)
3. Verify your email address

### 2. Create Your First Database

1. Click **"Create a project"**
2. Give it a name (e.g., `petcare-db`)
3. Select a region close to your Netlify deployment (e.g., `US East` for `us-east-1`)
4. Click **"Create project"**
5. Wait a few seconds while Neon provisions your database

### 3. Get Your Connection String

1. In your project dashboard, look for **"Connection Details"**
2. Copy the connection string. It looks like:
   ```
   postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/petcare-db?sslmode=require
   ```
3. Use this as your `DATABASE_URL` in `.env` or Netlify environment variables

### 4. Apply the Schema

Once you have your connection string, apply the schema:

```bash
# Using psql (install via `brew install libpq` on Mac or `apt install postgresql-client` on Linux)
psql "postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/petcare-db?sslmode=require" -f schema.sql

# Or use the Neon SQL Editor:
# 1. Go to https://console.neon.tech
# 2. Select your project
# 3. Click "SQL Editor" in the sidebar
# 4. Paste the contents of schema.sql
# 5. Click "Run"
```

### 5. Seed Demo Data (Optional)

```bash
psql "$DATABASE_URL" -f seed-database-fixed.sql
```

> **Important:** Always run `schema.sql` BEFORE `seed-database-fixed.sql`

### 6. Verify Your Connection

Test that everything is working:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
# Should return: 3 (John Smith, Sarah Johnson, Admin User)
```

---

## Local Development

### 1. Install Dependencies

```bash
# One command installs root, frontend, and functions deps via pnpm workspaces
pnpm install
```

### 2. Set Up Environment Variables

Copy the example file and adjust values for your environment:

```bash
cp .env.example .env
```

The `.env.example` file documents the required variables.
Keep `.env.example` in sync whenever new variables are added.
Example:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
# OR use individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petcare_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=replace_with_strong_random_secret
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:8888

# Node Environment
NODE_ENV=development
```

### 3. Set Up Database Schema (Production)

First, create the database schema using the provided schema file:

```bash
# Option 1: Using Neon SQL Editor (recommended)
# Copy contents of schema.sql and paste into Neon SQL Editor
# https://console.neon.tech

# Option 2: Using psql CLI
export DATABASE_URL="postgresql://user:password@host:port/database"
psql "$DATABASE_URL" -f schema.sql
```

### 4. Seed Test Data (Optional)

For local development, demo data is seeded into `localStorage` automatically.
For production, you can optionally load test data:

```bash
# Replace with your DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/petcare_db"

# Apply schema first (REQUIRED)
psql "$DATABASE_URL" -f schema.sql

# Then load test data
psql "$DATABASE_URL" -f seed-database-fixed.sql
```

**Important:** Always run `schema.sql` BEFORE `seed-database-fixed.sql`

**Key Points:**
- `schema.sql`: Contains complete table definitions with all columns
- `seed-database-fixed.sql`: Loads demo data for testing
- Tables use soft delete pattern (`deleted_at` column)
- All UNIQUE fields have indexes for performance
- Foreign keys cascade on delete to prevent orphaned records

### 5. Run Local Development Server

```bash
# Start Netlify Dev (runs both frontend and serverless functions)
pnpm dev
```

This will start:
- Frontend: http://localhost:8888
- Serverless functions: http://localhost:8888/.netlify/functions/*
- API routes (via redirects): http://localhost:8888/api/*

## Production Deployment

### 1. Connect Your Repository to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider (GitHub, GitLab, Bitbucket)
4. Select your repository

### 2. Configure Build Settings

Netlify uses `netlify.toml` in the repo root. Verify these align:

- **Base directory**: `.`
- **Build command**: `pnpm install --frozen-lockfile && pnpm --filter ./frontend build`
- **Publish directory**: `frontend/dist`
- **Functions directory**: `netlify/functions`

### 3. Set Environment Variables

Go to **Site settings** → **Environment variables** and add:

```
DATABASE_URL=<your_production_database_url>
JWT_SECRET=<your_production_jwt_secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=<your_netlify_site_url>
NODE_ENV=production
```

Or set them from CLI:

```bash
npx netlify env:set DATABASE_URL "postgresql://user:password@host:port/database?sslmode=require"
npx netlify env:set JWT_SECRET "replace_with_strong_random_secret"
npx netlify env:set JWT_EXPIRES_IN "7d"
npx netlify env:set FRONTEND_URL "https://your-site.netlify.app"
npx netlify env:set NODE_ENV "production"
```

Frontend production vars (Vite) are documented in `frontend/.env.production.example`:

```bash
VITE_API_URL=/api
```

**Important Security Notes:**
- Use a PostgreSQL database with SSL enabled in production
- Generate a strong, random JWT_SECRET (at least 32 characters)
- Never commit `.env` files to version control

### 4. Deploy

Push your code to the connected repository, and Netlify will automatically build and deploy.

You can also deploy manually:

```bash
# Build and deploy
npx netlify deploy --prod
```

### 5. Set Up Database on Production

Before deploying, ensure your production database has the correct schema:

```bash
# Using Neon SQL Editor
# 1. Go to https://console.neon.tech
# 2. Open SQL Editor
# 3. Copy-paste contents of schema.sql
# 4. Execute the schema

# OR using psql with your DATABASE_URL
psql "$PRODUCTION_DATABASE_URL" -f schema.sql

# Optionally load seed data
psql "$PRODUCTION_DATABASE_URL" -f seed-database-fixed.sql
```

After deployment, the application will use the `DATABASE_URL` environment variable to connect.

### 6. Configure a Custom Domain (Optional)

You can use your own domain (e.g., `petcare.yourname.com`) instead of the default `your-site.netlify.app`:

1. **Buy or transfer a domain** from a registrar like Namecheap, Google Domains, or GoDaddy

2. **Add your domain in Netlify**:
   ```bash
   npx netlify deploy --prod
   # Then go to Site settings → Domain management → Add custom domain
   ```
   Or via the dashboard:
   - Go to your site's **Site settings** → **Domain management**
   - Click **"Add custom domain"**
   - Enter your domain (e.g., `petcare.yourname.com`)
   - Click **"Verify"**

3. **Update DNS records** (at your domain registrar):
   - **Option A — Netlify DNS (easiest):** Let Netlify manage your DNS. Follow the instructions to set Netlify's nameservers at your registrar.
   - **Option B — External DNS:** Add a CNAME record pointing your domain to `your-site.netlify.app`

4. **Update environment variables** to match your domain:
   ```bash
   npx netlify env:set FRONTEND_URL "https://petcare.yourname.com"
   ```

5. **Enable HTTPS** — Netlify automatically provisions free SSL certificates via Let's Encrypt. It may take a few minutes after adding the domain.

6. **Verify everything works**:
   - Visit `https://petcare.yourname.com`
   - Log in with demo credentials
   - Check that API calls work (open DevTools → Network tab)

> **Note:** If your custom domain doesn't have the `FRONTEND_URL` matching, CORS errors may appear. Always update `FRONTEND_URL` after changing domains.

---

## API Routes

All API routes are automatically redirected to serverless functions:

- `/api/auth/*` → `/.netlify/functions/auth`
- `/api/users/*` → `/.netlify/functions/users`
- `/api/pets/*` → `/.netlify/functions/pets`
- `/api/appointments/*` → `/.netlify/functions/appointments`
- `/api/medical-records/*` → `/.netlify/functions/medical-records`
- `/api/vaccinations/*` → `/.netlify/functions/vaccinations`
- `/api/medications/*` → `/.netlify/functions/medications`
- `/api/clinical-records/*` → `/.netlify/functions/clinical-records`
- `/api/notifications/*` → `/.netlify/functions/notifications`

## Serverless Functions Structure

```
netlify/
└── functions/
    ├── utils/
    │   ├── database.ts      # Database connection pool
    │   ├── auth.ts          # Authentication helpers
    │   └── response.ts      # Response formatting
    ├── auth.ts              # Authentication endpoints
    ├── users.ts             # User management endpoints
    ├── pets.ts              # Pet management endpoints
    ├── appointments.ts      # Appointment endpoints
    ├── medical-records.ts   # Medical records endpoints
    ├── vaccinations.ts      # Vaccination endpoints
    ├── medications.ts       # Medication endpoints
    ├── clinical-records.ts  # Clinical records endpoints
    └── notifications.ts     # Notification endpoints
```

## Troubleshooting

### Database Connection Issues

- Ensure your DATABASE_URL is correct and includes SSL parameters if required
- Check that your database allows connections from Netlify's IP ranges
- Verify connection pool settings in `netlify/functions/utils/database.ts`

### Function Timeout

- Netlify free tier has a 10-second timeout for functions
- Optimize database queries to complete within this limit
- Consider upgrading to Pro for 26-second timeouts

### CORS Issues

- CORS headers are set in the `response.ts` utility
- Ensure `FRONTEND_URL` environment variable matches your deployment URL

### Build Failures

- Check that all dependencies are listed in `netlify/functions/package.json`
- Verify TypeScript compilation succeeds locally
- Review Netlify build logs for specific errors

## Monitoring and Logs

- **Function logs**: Site settings → Functions → View logs
- **Deploy logs**: Deploys tab → Select deploy → View logs
- **Real-time logs**: Use `netlify logs` CLI command

## Performance Optimization

- Use connection pooling (already configured in `database.ts`)
- Implement caching for frequently accessed data
- Monitor function execution time in Netlify analytics
- Consider CDN caching for static API responses

## Security Best Practices

1. **Always use HTTPS** in production (Netlify provides free SSL)
2. **Rotate JWT secrets** periodically
3. **Use environment variables** for all sensitive data
4. **Enable database SSL** in production
5. **Implement rate limiting** (consider Netlify Edge Functions)
6. **Regular security audits** of dependencies with `npm audit`

## Support

For issues:
- Check [Netlify Documentation](https://docs.netlify.com)
- Review [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- Contact support through Netlify dashboard
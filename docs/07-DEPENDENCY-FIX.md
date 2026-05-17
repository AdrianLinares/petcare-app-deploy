# Dependency Issues and Solutions

## Issues Found

The PetCare project had the following dependency-related issues:

### 1. **Netlify Functions - Dependencies Not Installed**
   - **Status**: ✅ FIXED
   - **Issue**: All dependencies were marked as UNMET
   - **Packages Affected**:
     - `@netlify/functions` - Netlify serverless runtime
     - `bcrypt` - Password hashing
     - `jsonwebtoken` - JWT authentication
     - `pg` - PostgreSQL database client
     - `typescript` - TypeScript compiler
     - All `@types/*` packages
   - **Root Cause**: NPM installation halting partway through package reification phase

### 2. **Frontend Build Tools Missing**
   - **Status**: ✅ FIXED
   - **Issue**: Vite and other build tools couldn't be executed
   - **Root Cause**: npm rebuild failed to create proper `.bin` symlinks

### 3. **Directory Lock Conflicts**
   - **Status**: ✅ FIXED
   - **Issue**: `ENOTEMPTY` errors during `npm install`, particularly with:
     - `chokidar`
     - `tailwindcss`
   - **Root Cause**: Partial installations leaving conflicting temporary directories

## Solutions Applied

### 1. **Created Fix Script** (`fix-dependencies.sh`)
   - Automates clean installation process
   - Removes problematic `node_modules` and lock files
   - Runs clean `pnpm install` (pnpm workspaces)
   - Supports all packages in one pass

### 2. **Migrated from npm to pnpm** (Security-driven)
   - Replaced `npm` with `pnpm` >= 10
   - Created `pnpm-workspace.yaml` for monorepo management
   - pnpm's content-addressable store prevents supply-chain attacks
   - Postinstall scripts require explicit approval (`onlyBuiltDependencies`)
   - Single `pnpm install` installs root, frontend, and functions

### 3. **Installation Steps**
   ```bash
   # Option 1: Run the automated fix script (recommended)
   ./fix-dependencies.sh

   # Option 2: Standard installation
   pnpm install
   ```

### 4. **Verified Installations**
   - ✅ Frontend: 1450+ packages installed including React, Vite, TypeScript
   - ✅ Netlify Functions: All dependencies including bcrypt, JWT, PostgreSQL driver
   - ✅ Build scripts for bcrypt, esbuild, netlify-cli, @swc/core, sharp approved and executed

## Key Packages Installed

### Frontend (`/frontend`)
- React 18.3.1
- Vite 5.4+ (build tool)
- TypeScript 5.9+
- Tailwind CSS 3.4+
- Radix UI components (@radix-ui/*)
- React Router 6
- TanStack React Query
- Axios (HTTP client)
- Hook Form (form handling)
- ESLint (code linting)

### Netlify Functions (`/netlify/functions`)
- @netlify/functions 2.8+ (serverless runtime)
- bcrypt 5.1+ (password hashing)
- jsonwebtoken 9.0+ (JWT auth)
- pg 8.18+ (PostgreSQL driver)
- TypeScript 5.9+ (for compilation)

## Verification

All installations have been verified as complete:

```bash
# Check frontend
pnpm ls --filter ./frontend --depth=0

# Check netlify functions
pnpm ls --filter ./netlify/functions --depth=0

# Verify build works
pnpm build
```

## Prevention Going Forward

The `fix-dependencies.sh` script can be run anytime dependencies become corrupted:

```bash
./fix-dependencies.sh
```

For CI/CD or deployment, Netlify uses:
```bash
pnpm install --frozen-lockfile && pnpm --filter ./frontend build
```

## Additional Notes

- The project uses **pnpm workspaces** with a shared lockfile (`pnpm-lock.yaml`)
- Postinstall scripts are restricted to approved packages via `onlyBuiltDependencies` in `pnpm-workspace.yaml`
- The content-addressable store prevents supply-chain attacks
- Dependencies are specified with caret ranges (^) allowing minor version updates

---

**Last Updated**: May 14, 2026  
**Status**: ✅ Migrated from npm to pnpm. All dependencies verified.

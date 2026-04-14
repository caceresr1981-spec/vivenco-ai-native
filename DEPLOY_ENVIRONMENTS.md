# Deploy environments setup (staging / production)

This project now deploys automatically from GitHub Actions:

- `staging` branch -> `deploy-staging.yml`
- `main` branch -> `deploy-production.yml`

## 1) GitHub Actions secrets

Configure these repository secrets in GitHub (`Settings -> Secrets and variables -> Actions`):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_STAGING`
- `VERCEL_PROJECT_ID_PROD`
- `RAILWAY_DEPLOY_HOOK_STAGING`
- `RAILWAY_DEPLOY_HOOK_PROD`

## 2) Vercel project layout

Recommended: two Vercel projects from the same repo.

- Staging project:
  - Connected branch: `staging`
  - Root Directory: `apps/web`
  - Project ID -> `VERCEL_PROJECT_ID_STAGING`
- Production project:
  - Connected branch: `main`
  - Root Directory: `apps/web`
  - Project ID -> `VERCEL_PROJECT_ID_PROD`

## 3) Railway services

Recommended: two Railway services (or two environments).

- Staging API service:
  - Deploy hook URL -> `RAILWAY_DEPLOY_HOOK_STAGING`
- Production API service:
  - Deploy hook URL -> `RAILWAY_DEPLOY_HOOK_PROD`

## 4) Runtime variables by environment

Set these in each platform environment (staging/prod), with different values:

- API:
  - `TRACKER_API_TOKEN`
  - `DATA_DIR` (if needed)
- Web:
  - API base URL used by the frontend config
  - frontend token only if absolutely required for your internal setup

## 5) Branch protection alignment

Keep required checks on protected branches:

- `lint`
- `test`
- `build`

Deploy workflows should run after merge to `staging` or `main`.

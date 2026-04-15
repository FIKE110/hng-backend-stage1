# HNG Stage 1 - Profile Intelligence Service

A backend API that takes a name, enriches it with data from Genderize, Agify, and Nationalize APIs, stores the result in Vercel Postgres, and provides endpoints to manage profiles.

## What This Does

When you send a name to this API, it:
1. Calls Genderize.io to get gender info
2. Calls Agify.io to get age info
3. Calls Nationalize.io to get country info
4. Picks the country with highest probability
5. Classifies age into groups (child, teenager, adult, senior)
6. Saves everything to the database
7. Returns the full profile

If you send the same name again, it returns the existing profile (idempotency).

## Tech Stack

- Node.js + TypeScript
- Hono framework
- Vercel Postgres
- Vercel for deployment

## How to Run Locally

1. Install dependencies:
```bash
pnpm install
```

2. Set up your local database. Create a `.env` file:
```
POSTGRES_URL=postgres://user:pass@localhost:5432/dbname
```

3. Run the server:
```bash
pnpm dev
```

Server runs at `http://localhost:3000`

## Deploying to Vercel

1. Create a Vercel project and add a Postgres database
2. Set the `POSTGRES_URL` environment variable in Vercel
3. Deploy:
```bash
vc deploy
```

## API Endpoints

### POST /api/profiles
Create a new profile. Pass `{"name": "john"}` in the body.

Returns 201 with full profile, or 200 if profile already exists.

### GET /api/profiles
List all profiles. Optional query params: `gender`, `country_id`, `age_group`

Example: `/api/profiles?gender=male&country_id=NG`

Returns simplified list (no probability data).

### GET /api/profiles/:id
Get a single profile by UUID.

### DELETE /api/profiles/:id
Delete a profile. Returns 204 on success.

## Error Codes

- 400: Missing or empty name
- 404: Profile not found
- 500: Server error
- 502: One of the external APIs returned invalid data (e.g., no gender found)

## Database Table

Table name: `profiles`

Columns:
- id (UUID v7, primary key)
- name (lowercased)
- gender (male/female)
- gender_probability (0-1)
- sample_size (count from Genderize)
- age (number)
- age_group (child/teenager/adult/senior)
- country_id (2-letter country code)
- country_probability (0-1)
- created_at (UTC timestamp)

Indexes on: name, gender, country_id, age_group

## Files

- `src/index.ts` - Main app with all routes
- `src/db.ts` - Database functions
- `src/profileService.ts` - External API calls and data processing
- `vercel.json` - Vercel config
- `tsconfig.json` - TypeScript config

## Notes

- All timestamps in UTC ISO 8601
- All IDs are UUID v7
- CORS enabled for all origins (`*`)
- The name is stored in lowercase
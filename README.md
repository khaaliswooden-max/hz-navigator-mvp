# HZ Navigator MVP

A HUBZone certification verification platform built with Next.js 14, designed for instant Vercel deployment.

![HZ Navigator](https://img.shields.io/badge/HUBZone-Certification%20Platform-1e40af)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## 🌐 Live Demo

**Production:** [hz-navigator-mvp.vercel.app](https://hz-navigator-mvp.vercel.app)

- **Landing Page** (`/`) - Marketing page with interactive HUBZone address lookup demo
- **Dashboard** (`/dashboard`) - Full compliance management application

## 🚀 Quick Deploy to Vercel

### Prerequisites

1. **GitHub Account** - Your repo is at `khaaliswooden-max/hz-navigator-mvp`
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier works)
3. **Neon Account** - Sign up at [neon.tech](https://neon.tech) (free tier, PostgreSQL with PostGIS)
4. **Mapbox Account** - Sign up at [mapbox.com](https://mapbox.com) (free tier)

### Step 1: Set Up Database (Neon)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project (name: `hz-navigator`)
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb`)
4. Enable PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### Step 2: Get Mapbox Token

1. Go to [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens)
2. Copy your **Default public token** (starts with `pk.`)

### Step 3: Deploy to Vercel

**Option A: One-Click Deploy**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/khaaliswooden-max/hz-navigator-mvp)

**Option B: Manual Deploy**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo: `khaaliswooden-max/hz-navigator-mvp`
3. Configure Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox public token |

4. Click **Deploy**

### Step 4: Initialize Database

After deployment, run the Prisma migration:

```bash
# In Vercel dashboard, go to your project
# Settings > Functions > Console
# Or locally with your production DATABASE_URL:

npx prisma db push
```

## 🏗️ Local Development

```bash
# Clone the repo
git clone https://github.com/khaaliswooden-max/hz-navigator-mvp.git
cd hz-navigator-mvp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
hz-navigator-mvp/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── hubzone/lookup/    # HUBZone verification API
│   │   │   ├── employees/         # Employee CRUD
│   │   │   └── compliance/        # Compliance stats
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Dashboard application
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Marketing landing page
│   ├── components/
│   │   ├── AddressLookup.tsx
│   │   ├── ComplianceDashboard.tsx
│   │   ├── EmployeeTable.tsx
│   │   └── HubzoneMap.tsx
│   └── lib/
│       ├── prisma.ts              # Database client
│       └── utils.ts               # Helper functions
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🖥️ Pages

### Landing Page (`/`)
Modern marketing landing page featuring:
- **Hero Section** - Eye-catching headline with animated background
- **Live Demo** - Interactive HUBZone address lookup (no sign-up required)
- **Features Overview** - Instant verification, employee tracking, analytics, certification management
- **How It Works** - 3-step onboarding guide
- **Testimonials** - Customer success stories
- **Pricing Tiers** - Starter (Free), Professional ($99/mo), Enterprise (Custom)
- **Trust Badges** - SBA Certified Data, SOC 2 Compliant, 256-bit Encryption

### Dashboard (`/dashboard`)
Full-featured compliance management application:
- **Compliance Dashboard** - Real-time 35% requirement tracking with trend charts
- **Address Lookup** - Check any US address for HUBZone eligibility with map visualization
- **Employee Roster** - Track employee addresses and residency status
- **HUBZone Map** - Interactive Mapbox-powered map with HUBZone layers

## ✨ Features

### MVP (Current)
- ✅ **Marketing Landing Page** - Professional landing page with live demo
- ✅ **Address Lookup** - Check any US address for HUBZone eligibility
- ✅ **Interactive Map** - Mapbox-powered visualization with HUBZone layers
- ✅ **Employee Roster** - Track employee addresses and residency status
- ✅ **Compliance Dashboard** - Real-time 35% requirement tracking
- ✅ **Trend Analytics** - 12-month compliance history charts
- ✅ **Responsive Design** - Works on desktop and mobile

### Coming Soon
- 🔜 User authentication and accounts
- 🔜 Employee CSV import/export
- 🔜 Automated re-verification scheduling
- 🔜 Email notifications for compliance warnings
- 🔜 Multi-organization support
- 🔜 Full SBA HUBZone boundary data integration

## 🔧 API Reference

### GET `/api/hubzone/lookup`
Check HUBZone status for an address.

```bash
curl "https://hz-navigator-mvp.vercel.app/api/hubzone/lookup?address=100+N+Court+Square,+Huntsville+AL"
```

Response:
```json
{
  "address": "100 N Court Square, Huntsville, AL",
  "latitude": 34.7304,
  "longitude": -86.5861,
  "isHubzone": true,
  "hubzoneType": "QCT",
  "cached": false
}
```

### GET `/api/employees`
List employees for an organization.

```bash
curl "https://hz-navigator-mvp.vercel.app/api/employees?orgId=demo-org-001"
```

### GET `/api/compliance/stats`
Get compliance statistics.

```bash
curl "https://hz-navigator-mvp.vercel.app/api/compliance/stats?orgId=demo-org-001"
```

## 🎨 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL + PostGIS (Neon) |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Maps | Mapbox GL JS |
| Charts | Recharts |
| Icons | Lucide React |
| Validation | Zod |
| Hosting | Vercel |

## 📄 License

Copyright © 2024 Visionblox LLC. All rights reserved.

---

**Built with ❤️ for federal contractors navigating HUBZone certification.**

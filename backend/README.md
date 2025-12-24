# Insyd Backend API

ExpressJS backend for Material Control OS (M-COS).

## Local Development

```bash
npm install
npm run dev
```

Server runs on `http://localhost:4000` (or PORT env variable).

## Deployment

### Render.com

1. Push code to GitHub
2. Connect repository to Render
3. Create new Web Service
4. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
5. Add environment variable: `PORT=10000` (Render sets this automatically)

### Railway

1. Push code to GitHub
2. Connect repository to Railway
3. Railway auto-detects Node.js
4. Deploy

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/items` - List all items with metrics
- `POST /api/items` - Create new item
- `POST /api/transactions/purchase` - Record purchase
- `POST /api/transactions/issue` - Record issue
- `POST /api/transactions/damage` - Record damage
- `POST /api/transactions/issueToSite` - Issue to site (with areaCompleted)
- `GET /api/sites` - List sites
- `POST /api/sites` - Create site
- `GET /api/norms` - List norms
- `POST /api/norms` - Create norm
- `GET /api/sites/metrics` - Site leakage metrics
- `GET /api/sites/usage-metrics` - SiteWise usage metrics
- `GET /api/usage-templates` - List usage templates
- `POST /api/usage-templates` - Create usage template
- `GET /api/actions` - Get action suggestions


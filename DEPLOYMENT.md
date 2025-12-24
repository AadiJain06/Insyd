# Deployment Guide - Material Control OS (M-COS)

Quick deployment guide for Insyd AEC Inventory System.

## Prerequisites

- GitHub account
- Render.com account (for backend) - [Sign up](https://render.com)
- Vercel account (for frontend) - [Sign up](https://vercel.com)

## Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Material Control OS"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/insyd.git

# Push to GitHub
git push -u origin main
```

## Step 2: Deploy Backend (Render.com)

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Click "Connect GitHub"
   - Authorize Render to access your repositories
   - Select your `insyd` repository

3. **Configure Service**
   - **Name**: `insyd-backend` (or any name)
   - **Region**: Choose closest to you (e.g., `Mumbai` for India)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Environment Variables**
   - Render automatically sets `PORT` (usually `10000`)
   - No additional env vars needed for basic deployment

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for first deployment
   - Copy the service URL (e.g., `https://insyd-backend.onrender.com`)

6. **Test Backend**
   - Visit `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status":"ok"}`

## Step 3: Deploy Frontend (Vercel)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Click "Add New Project"

2. **Import Repository**
   - Click "Import" next to your GitHub repository
   - Or connect GitHub account if not already connected

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Environment Variables**
   - Click "Environment Variables"
   - Add:
     - **Key**: `NEXT_PUBLIC_API_BASE`
     - **Value**: `https://your-backend-url.onrender.com` (use your actual backend URL from Step 2)
   - Click "Save"

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build and deployment
   - Copy the deployment URL (e.g., `https://insyd-frontend.vercel.app`)

6. **Test Frontend**
   - Visit your Vercel URL
   - Try adding an item and recording a movement
   - Check browser console for any API errors

## Step 4: Verify Deployment

### Backend Tests
```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Should return: {"status":"ok"}
```

### Frontend Tests
1. Open your Vercel URL
2. Add a new item (e.g., "Test Item", SKU: "TEST-001", Unit: "pcs")
3. Record a purchase movement
4. Check if stock updates correctly
5. Verify SKU health metrics appear

## Troubleshooting

### Backend Issues

**Issue**: Backend returns 404
- **Fix**: Check Root Directory is set to `backend` in Render settings

**Issue**: Backend crashes on start
- **Fix**: Check Render logs, ensure `npm start` command is correct
- Verify `package.json` has `"start": "node index.js"`

**Issue**: CORS errors
- **Fix**: Backend already has CORS enabled, but verify frontend URL is allowed

### Frontend Issues

**Issue**: API calls fail (network error)
- **Fix**: Check `NEXT_PUBLIC_API_BASE` environment variable in Vercel
- Ensure backend URL is correct and accessible

**Issue**: Build fails
- **Fix**: Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Try `npm install` locally to verify

**Issue**: Data resets on backend restart
- **Note**: This is expected - backend uses in-memory storage
- For production, add PostgreSQL/MongoDB

## Alternative Platforms

### Backend Alternatives

**Railway**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repository, set Root Directory to `backend`
4. Railway auto-detects Node.js

**Heroku**
1. Install Heroku CLI
2. `heroku create insyd-backend`
3. `git subtree push --prefix backend heroku main`
4. `heroku config:set PORT=...` (auto-set)

### Frontend Alternatives

**Netlify**
1. Go to [netlify.com](https://netlify.com)
2. Add site → Import from Git
3. Base directory: `frontend`
4. Build command: `npm run build`
5. Publish directory: `.next`

**Cloudflare Pages**
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect GitHub repository
3. Framework: Next.js
4. Build command: `npm run build`
5. Root directory: `frontend`

## Production Considerations

1. **Add Database**: Replace in-memory storage with PostgreSQL/MongoDB
2. **Add Authentication**: Implement user roles (admin, store, sales)
3. **Add Error Monitoring**: Use Sentry or similar
4. **Add Logging**: Use Winston or similar
5. **Add Rate Limiting**: Protect API endpoints
6. **Add HTTPS**: Both platforms provide SSL automatically
7. **Add Backup**: Database backups for production data

## Cost Estimates

- **Render (Backend)**: Free tier available (spins down after inactivity)
- **Vercel (Frontend)**: Free tier available (generous limits)
- **Total**: $0/month for small-scale usage

For production scale, consider:
- Render paid plan: ~$7/month (always-on)
- Vercel Pro: ~$20/month (if needed)

## Support

If you encounter issues:
1. Check platform logs (Render/Vercel dashboards)
2. Verify environment variables
3. Test backend API directly (curl/Postman)
4. Check browser console for frontend errors


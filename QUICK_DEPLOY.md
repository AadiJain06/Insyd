# Quick Deployment Checklist

Follow these steps to deploy your Material Control OS.

## ✅ Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] Backend runs locally (`cd backend && npm run dev`)
- [ ] Frontend runs locally (`cd frontend && npm run dev`)
- [ ] All features tested locally

## 🚀 Deployment Steps

### 1. Backend (Render.com) - 5 minutes

1. Go to [render.com](https://render.com) → Sign up/Login
2. Click "New +" → "Web Service"
3. Connect GitHub → Select your repository
4. Settings:
   - Name: `insyd-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build: `npm install`
   - Start: `npm start`
5. Click "Create Web Service"
6. **Copy the URL** (e.g., `https://insyd-backend.onrender.com`)

### 2. Frontend (Vercel) - 5 minutes

1. Go to [vercel.com](https://vercel.com) → Sign up/Login
2. Click "Add New Project"
3. Import your GitHub repository
4. Settings:
   - Framework: Next.js (auto)
   - Root Directory: `frontend`
5. Environment Variables:
   - Add `NEXT_PUBLIC_API_BASE` = `https://your-backend-url.onrender.com`
6. Click "Deploy"
7. **Copy the URL** (e.g., `https://insyd-frontend.vercel.app`)

### 3. Test Deployment

- [ ] Backend health: `https://your-backend.onrender.com/api/health` → `{"status":"ok"}`
- [ ] Frontend loads without errors
- [ ] Can add items
- [ ] Can record movements
- [ ] Metrics appear correctly

## 📝 Submission Links

After deployment, you'll have:

- **GitHub Repository**: `https://github.com/yourusername/insyd`
- **Backend URL**: `https://insyd-backend.onrender.com`
- **Frontend URL**: `https://insyd-frontend.vercel.app`

Include these in your assignment submission!

## ⚠️ Important Notes

- Data resets on backend restart (in-memory storage)
- Free tiers may spin down after inactivity (first request may be slow)
- For production, add a database (PostgreSQL/MongoDB)

## 🆘 Need Help?

See `DEPLOYMENT.md` for detailed troubleshooting.


# TunaFlow: Technical Deployment & Repository Guide

This document provides a deep-dive into the deployment architecture, step-by-step setup instructions, and a reference of the repository structure for the TunaFlow ecosystem.

---

## 🛠️ 1. Prerequisites & Environment

Before starting, ensure the following tools are installed and accounts are active:
- **Node.js (v18+) & Bun**: For frontend development and automation scripts.
- **Python (v3.10+)**: For the AI Core backend.
- **Docker**: Optional, for containerized backend deployment.
- **Supabase Account**: For Database, Auth, and Real-time services.
- **Azure/DigitalOcean VM**: For hosting the Python AI service.

---

## 💾 2. Database Deep-Dive (Supabase)

TunaFlow relies on **Supabase (PostgreSQL)** for transactional data and real-time updates.

### 2.1 Schema Initialization
Execute the following SQL scripts in the Supabase SQL Editor in this exact order:
1. `sql_scripts/supabase_schema.sql`: Sets up core tables (`products`, `orders`, `profiles`, etc.).
2. `sql_scripts/pricing_schema.sql`: Implements functions and triggers for dynamic pricing.
3. `sql_scripts/fix_database_and_rls.sql`: Applies high-security Row Level Security (RLS) policies.

### 2.2 Environment Variables
Create a `.env` file in the root directory with the following keys:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AI_SERVER_URL=http://your-vm-ip:6969
```

---

## 🐍 3. AI Core Backend (TunaBrain AI)

The AI Core is a Python-based service that handles complex inventory analysis and chatbot interactions.

### 3.1 Local/VM Manual Setup
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate venv: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python main.py`

### 3.2 Docker Deployment
```bash
cd backend
docker build -t tunaflow-ai-backend .
docker run -d -p 6969:6969 tunaflow-ai-backend
```

### 3.3 Azure VM Deployment
- **Ports**: Ensure port `6969` (TCP) is open in the Azure Network Security Group (NSG).
- **Process Management**: Use `pm2` or `systemd` to keep the Python script running in the background.

---

## ⚛️ 4. Frontend Web Application

The frontend is a React application built with TypeScript and Vite.

### 4.1 Development Mode
```bash
npm install
npm run dev
```

### 4.2 Production Build
```bash
npm run build
```
This generates a flat `dist/` folder ready for static hosting.

---

## 🚢 5. Continuous Deployment & FTP

### 5.1 Manual FTP Upload (InfinityFree)
TunaFlow includes a custom script to automate FTP uploads.
1. Configure FTP credentials in `.env`:
   - `FTP_SERVER=ftpupload.net`
   - `FTP_USERNAME=your_username`
   - `FTP_PASSWORD=your_password`
   - `FTP_DIR=htdocs`
2. Run the deployment:
   ```bash
   npm run deploy:ftp
   ```

### 5.2 GitHub Actions
Automatic deployment is triggered on every push to the `main` branch. Ensure the variables in `.github/workflows/deploy.yml` match your Secrets.

---

## 📂 6. Repository Reference (Directory Map)

| Path | Purpose | Key Files |
|------|---------|-----------|
| **/src/pages** | UI Views & Core Logic | `Inventory.tsx`, `POS.tsx`, `AIManager.tsx` |
| **/src/services** | API & Data Interactors | `aiService.ts`, `auditService.ts` |
| **/src/components** | Reusable UI Elements | `StoreLayout.tsx`, `/ui` (Shadcn components) |
| **/backend** | AI Core Service | `main.py`, `Dockerfile` |
| **/sql_scripts** | Database Migrations | `supabase_schema.sql`, `pricing_schema.sql` |
| **/scripts** | Automation & Tooling | `upload-ftp.js`, `start.ts` |
| **/.github** | CI/CD Config | `deploy.yml` |

---

## 📄 Documentation Links
- [Main README](README.md) - Project Overview & Business Strategy
- [Resources Table](RESOURCES.md) - Hardware & Software list

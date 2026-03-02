# TunaFlow: AI-Integrated Supply Chain & Dynamic Pricing for the Tuna Industry

**TunaFlow** is a comprehensive digital solution designed to revolutionize the tuna supply chain in General Santos City (the "Tuna Capital of the Philippines"). By integrating real-time inventory management with AI-driven dynamic pricing, TunaFlow addresses critical inefficiencies in the perishable seafood market.

---

## 📘 Research & Business Context

### 1. Problem Statement
The tuna industry in General Santos City faces significant challenges due to the highly perishable nature of the product. Traditional pricing models are often static or based on manual estimations, leading to:
- **Product Waste**: Significant spoilage due to slow turnover of older stock.
- **Profit Loss**: Inability to quickly adjust prices in response to market saturation or catch spikes.
- **Data Fragmentation**: Lack of centralized records for supplier transactions and customer patterns.

### 2. The TunaFlow Solution
TunaFlow provides a "Digital Nervous System" for seafood enterprises. It moves traditional operations into a real-time, data-driven environment.
- **Dynamic Pricing**: Instead of fixed prices, TunaFlow uses algorithms to adjust pricing based on catch freshness, inventory age, and local market demand.
- **Supply Chain Visibility**: Tracks the journey from "Hook to Table," ensuring stakeholders have accurate data at every touchpoint.
- **Operational Efficiency**: Automates inventory counts and POS transactions, reducing human error and accelerating business velocity.

### 3. Business Value Proposition
- **Revenue Optimization**: Maximizing margins on premium cuts while ensuring faster clearance of nearing-expiry stock through automated discounts.
- **Sustainability**: Directly contributes to the UN Sustainable Development Goals (SDG 12: Responsible Consumption and Production) by minimizing seafood waste.
- **Scalability**: Designed as a modular platform that can expand from single-vendor kiosks to city-wide marketplace networks.

---

## 🏗️ System Functionality

Every feature in TunaFlow is mapped to a specific business or research objective:

| Module | Functionality | Academic/Business Value |
|--------|---------------|-------------------------|
| **Unified Dashboard** | Real-time demand & price visualization | Market Research Data & Trend Analysis |
| **Dynamic Pricing** | AI-suggested price adjustments | Revenue Management & Waste Reduction |
| **Smart Inventory** | Grade-based tracking (e.g., Grade A vs. Grade C) | Quality Control & Perishability Management |
| **Hybrid POS** | B2B (Vendor) and B2C (Consumer) sales | Transactional Efficiency & Data Integrity |
| **Auditing & Logs** | Full trail of every price change and sale | Transparency for Compliance & Research |
| **AI Assistant** | Natural language inventory management | Lowering the Bar for Digital Adoption |

---

## 🚀 Deployment Guide (Verified)

This section details the current and supported deployment architecture. Legacy Netlify/Wrangler methods are deprecated in favor of this robust setup.

### 1. Database & Cloud (Supabase)
TunaFlow uses **Supabase** for its PostgreSQL database, Authentication, and Real-time engine.
1. **Schema Initialization**: Execute `sql_scripts/supabase_schema.sql` and `sql_scripts/pricing_schema.sql` to set up the core tables and functions.
2. **Security**: Run `sql_scripts/fix_database_and_rls.sql` to ensure Row Level Security is active.
3. **Environment**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your `.env`.

### 2. AI Core Backend (TunaBrain AI)
The AI engine runs on a dedicated Python service (usually hosted on an Azure VM).
- **Manual Setup**:
  ```bash
  cd backend
  pip install -r requirements.txt
  python main.py
  ```
- **Docker Setup (Recommended for Production)**:
  ```bash
  cd backend
  docker build -t tunaflow-ai-backend .
  docker run -d -p 6969:6969 tunaflow-ai-backend
  ```
- **Service Port**: Default is `6969`. Ensure the firewall allows traffic to this port.

### 3. Frontend Web Application (Vite + React)
Designed for both desktop (Admin) and mobile (POS/Kiosk) use.
- **Build**:
  ```bash
  npm install
  npm run build
  ```
- **Manual Deployment**: Use the provided FTP tool to upload the `dist/` folder to your web host (e.g. InfinityFree).
  ```bash
  npm run deploy:ftp
  ```

---

## 📄 Repository References
- **[RESOURCES.md](RESOURCES.md)**: Hardware/Software specifications for business planning.
- **[sql_scripts/](sql_scripts/)**: Database migration and schema definitions.
- **[scripts/](scripts/)**: Automation tools for deployment and development.

---

*This project is part of a research initiative to enhance the digital maturity of the seafood industry in the Philippines.*

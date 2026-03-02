# TunaFlow: An AI-Integrated Ecosystem for Perishable Tuna Supply Chain Optimization

**TunaFlow** is a state-of-the-art digital platform specifically engineered to bridge the gap between traditional seafood commerce and modern data-driven logistics in General Santos City, the "Tuna Capital of the Philippines." By leveraging artificial intelligence and real-time data synchronization, TunaFlow transforms the highly volatile and perishable tuna market into a streamlined, predictable, and highly profitable business ecosystem.

---

## 📘 1. Research & Academic Framework

### 1.1 Problem Statement: The Perishability Crisis
In the tuna industry, time is the primary determinant of value. Traditional supply chains in GenSan rely on manual records and static pricing, which fail to respond to:
- **Rapid Quality Decay**: Tuna freshness (Grade A to C) fluctuates hourly, rendering fixed daily prices obsolete.
- **Catch Volatility**: Unpredictable harvest volumes lead to massive surpluses (gluts) or shortages, causing extreme price swings that harm both fishers and sellers.
- **Information Asymmetry**: Sellers often lack real-time insights into market demand, leading to inefficient stock allocation.

### 1.2 System Impact & Methodology
TunaFlow employs a **Real-Time Dynamic Response (RTDR)** methodology. By digitizing every transaction and inventory movement, the system enables:
- **Waste Reduction (SDG 12)**: Minimizing physical loss through automated markdowns for older stock.
- **Economic Resilience**: Protecting vendor margins through data-backed pricing suggestions.
- **Traceability**: Creating a transparent "Hook-to-Table" data trail for food safety and sustainability auditing.

---

## 💼 2. Business Plan & Operational Strategy

### 2.1 Market Value Proposition
TunaFlow provides a competitive edge through **Operational Intelligence**. It is not just a POS; it is a Business Intelligence (BI) suite tailored for seafood.
- **ROI Acceleration**: Reduced waste and optimized pricing directly increase bottom-line profit by an estimated 15-20%.
- **Customer Retention**: Personalized CRM tools allow vendors to reward loyalty and track high-value buyer preferences.
- **Multi-Store Scalability**: The SuperAdmin architecture allows a single operator to manage multiple kiosks or landing sites across the city from one dashboard.

### 2.2 Strategic Operational Goals
- **Zero-Waste Inventory**: Aiming for a 100% clearance rate of perishable inventory before quality drops below Grade C.
- **Inclusive Digitalization**: Designing a mobile-first interface (Kiosk Mode) that is intuitive for traditional vendors with minimal technical training.

---

## 🏗️ 3. Exhaustive System Directory (Feature Map)

Every page and component in TunaFlow is designed to solve a specific operational pain point.

### 3.1 Core Admin & Management Pages
| Page | Purpose | Strategic Value |
|------|---------|-----------------|
| **Dashboard** | Unified view of sales, inventory health, and market trends. | Provides executive-level visibility for decision-makers. |
| **Inventory** | Management of species (Yellowfin, Skipjack), cuts, and grades. | Prevents "ghost stock" and ensures accurate quality tracking. |
| **Pricing** | Central hub for AI-driven dynamic pricing rules. | Automates the response to market volatility and perishability. |
| **Reports** | Deep analytical reports on turnover, profit, and loss. | Basis for historical analysis and long-term business planning. |
| **Suppliers** | Management of sourcing origins and supplier performance. | Optimizes the upstream supply chain and ensures reliable sourcing. |
| **Customers** | CRM for tracking buyer behavior and loyalty. | Increases Lifetime Value (LTV) through personalized service. |

### 3.2 Sales & Point of Sale (POS)
| Page | Purpose | Strategic Value |
|------|---------|-----------------|
| **POS (Full)** | High-speed interface for desktop-based checkout and B2B bulk orders. | Accelerates transaction flow during peak market hours. |
| **Kiosk Mode** | A simplified, mobile-responsive interface for street-level or market stall vendors. | Lowers the barrier to digital adoption for smaller vendors. |
| **Orders** | Tracking the lifecycle of pending, completed, and cancelled transactions. | Ensures operational accountability and prevents missed sales. |
| **Cart & Checkout** | Temporary staging for multi-item transactions. | Supports complex order configurations (e.g., mixed species/grades). |

### 3.3 Advanced AI & Configuration
| Page | Purpose | Strategic Value |
|------|---------|-----------------|
| **AI Manager** | Interactive chat interface (TunaBrain) for inventory and pricing advice. | Democratizes AI insights for non-technical business owners. |
| **SuperAdmin** | Global platform governance, vendor onboarding, and system monitoring. | Enables the "System as a Service" (SaaS) business model. |
| **Settings** | Configuration of store profiles, tax rates, and currency. | Customizes the platform to local regulatory and branding needs. |
| **Shipping** | Management of delivery zones and logistics providers. | Supports the expansion into home delivery and remote distribution. |
| **Payment** | Configuration of cash and digital payment gateways. | Ensures financial flexibility and security. |

---

## 🛠️ 4. Technical Architecture (Deep Dive)

### 4.1 Service Layer Logic
The system's "Intelligence" lives in three primary services:
- **`aiService.ts`**: Handles logic for the TunaBrain AI, including inventory-sensitive advice and automated pricing suggestions.
- **`auditService.ts`**: Maintains the immutable "Audit Log" (logged in Supabase) for every system action, ensuring compliance and research integrity.
- **`uploadService.ts`**: Manages the storage of product images and document assets using Supabase Storage.

### 4.2 Database & Data Integrity
TunaFlow uses **Supabase (PostgreSQL)** with complex Row Level Security (RLS) to ensure data privacy:
- **Vendors** only see their own sales and inventory.
- **SuperAdmins** have global visibility but restricted mutation rights.
- **Customers** can view their own profile and order history in the marketplace.

---

## 🚀 5. Deployment & Sustainability (Verified)

### 5.1 Infrastructure
- **Cloud Database**: Supabase (AWS backend) providing 99.9% uptime.
- **AI Backend**: Python-based AI Core hosted on high-performance Azure VMs.
- **Frontend Hosting**: Optimized for Netlify (Edge) or InfinityFree (FTP).

### 5.2 Deployment Steps
1. **Prepare Database**: Execute SQL scripts in `sql_scripts/` (Schema -> Pricing -> RLS).
2. **Launch AI Core**: Initialize the Python backend in the `/backend` directory.
3. **Build Frontend**: Run `npm run build` and deploy the `dist/` folder via FTP or CI/CD.

---

## 📈 6. Future Roadmap
- **Blockchain Traceability**: Integrating Distributed Ledger Technology (DLT) for immutable catch-documentation.
- **IoT Integration**: Smart sensors in cold storage to feed real-time temperature data into the AI pricing model.
- **Mobile Kiosk App**: Native iOS/Android apps for offline-first vendor operations.

---

*This project is a flagship initiative demonstrating how AI can empower traditional industries in the Philippines. For academic inquiries or business partnership, please contact the TunaFlow Governance Team.*

# TunaFlow

Dynamic Pricing Optimization for Perishable Tuna Products.

## Project Vision

> "To lead the future of seafood commerce by perfecting the flow of tuna through intelligent pricing and sustainable supply chain innovation."

## Project Mission

> "TunaFlow empowers seafood businesses by providing advanced, AI-driven tools for real-time inventory management and pricing optimization, ensuring sustainability and profitability are achieved together through everyday operational excellence."

## Project Info

This project is a React-based web application for managing tuna inventory and optimizing pricing strategies for TunaFlow.

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Getting Started

To get started with development:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is configured to automatically deploy to **InfinityFree** via GitHub Actions whenever changes are pushed to the `main` branch.

### 1. GitHub Actions Setup
To enable automatic deployment, you must add the following **Secrets** to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Value Example |
|-------------|---------------|
| `FTP_SERVER` | `ftpupload.net` |
| `FTP_USERNAME` | `if0_41108542` |
| `FTP_PASSWORD` | *(Your InfinityFree Password)* |

### 2. Local Manual Deployment
You can also deploy manually from your local machine:
```bash
npm run build
npm run deploy:ftp
```
*Make sure your `.env` file contains the correct FTP credentials.*

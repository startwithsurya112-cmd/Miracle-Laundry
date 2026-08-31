# 🧺 Miracle Laundry - Multi-Branch Laundry & POS Management System

A modern, production-ready, **Multi-Branch & Mobile-First** Laundry & Dry Cleaning Management System. Designed for laundry shop owners and chain businesses to manage multiple stores, counter POS billing, staff attendance, machine cycle logs, expense accounting, digital receipts with QR codes, automated WhatsApp sharing, and multi-tenant store isolation.

---

## 🌟 Key Features

### 🏢 Multi-Branch & Store Tenant Management
* **Super Admin (Owner)**: Central control with full access across all regional branches, global consolidated financial analytics, and one-click store switching.
* **Store-Isolated Branch Admins**: Branch managers log in to their assigned store with strict data isolation (`orders`, `customers`, `expenses`, `staff`, `machines`, and `reports` for their branch only).
* **Branch Switcher**: Interactive switcher in the navbar allowing Super Admin to switch branch context instantly without logging out.
* **Role & User Management (`/users`)**: Create and manage branch managers and staff with granular permissions and branch assignments.

### 📱 Express POS & Touch Order Builder
* **Category & Garment Tabs**: Fast POS order builder (Clothes, Dry Cleaning, Household, Footwear).
* **Step-by-Step Workflow**: Order status management: `Received` → `Washing` → `Drying` → `Ironing` → `Packing` → `Ready for Delivery` → `Delivered`.
* **Payments & Balances**: Record full, advance, and partial payments (`Cash`, `UPI`, `Card`) with auto-calculated outstanding balances.

### 🧾 Digital Invoices, QR Codes & WhatsApp
* **Thermal & A4 Receipts**: Printable receipts formatted for standard printers and 80mm thermal receipt printers.
* **Dynamic QR Verification**: Dynamic verification and UPI QR codes embedded directly onto invoices.
* **Instant WhatsApp Sharing**: 1-tap customer invoice sharing via WhatsApp Web & mobile link.

### ⚙️ Operational Modules
* **Staff Attendance & Payroll (`/staff`)**: Daily register, clock-in/out tracking, overtime calculation, and ironing productivity logs.
* **Machine & LPG Cylinder Analytics (`/machines`)**: Washer extractor and dryer cycle logging, commercial LPG cylinder longevity tracking.
* **Accounts & Expense Vouchers (`/accounts`)**: Petty cash and bank expense recording with voucher generation and monthly profit & loss statements.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, PWA support.
* **Backend**: Node.js, Express.js, TypeScript, Mongoose ODM, JWT, bcryptjs, PDFKit, QRCode.
* **Database**: MongoDB Atlas (Cloud) or Local MongoDB.

---

## 🔑 Default Credentials

* **Super Admin Username**: `adminIL`
* **Super Admin Password**: `IL@112`
* **Branch Admins**: Created and assigned to specific branches via the **Admins & Roles** (`/users`) page.

---

## 💻 Local Development Setup

### 1. Prerequisites
* **Node.js**: v18 or higher
* **npm**: v9 or higher
* **MongoDB**: Local MongoDB instance or free MongoDB Atlas cluster

### 2. Backend Setup
```bash
cd backend
npm install
npm run seed     # Automatically creates the main branch and seeds the super admin account
npm run dev      # Starts the backend server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Starts the Vite dev server on http://localhost:5173
```

---

## 🌐 Step-by-Step Deployment Guide on Render

You can host both the Backend API and the Frontend Single Page Application on [Render](https://render.com) using free/starter tiers.

---

### Step 1: Set up MongoDB Atlas (Cloud Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database) and sign in.
2. Create a free **M0 Cluster**.
3. Under **Security → Network Access**, click **Add IP Address** and select **Allow Access from Anywhere (`0.0.0.0/0`)**.
4. Under **Security → Database Access**, create a database user (e.g. `laundry_admin`) with a secure password.
5. Click **Connect → Drivers** and copy the connection string. It will look like:
   ```
   mongodb+srv://laundry_admin:<password>@cluster0.xxxxx.mongodb.net/miraclelaundry?retryWrites=true&w=majority
   ```

---

### Step 2: Deploy Backend as a Render Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New + → Web Service**.
2. Connect your GitHub repository: `https://github.com/startwithsurya112-cmd/Miracle-Laundry.git`.
3. Configure the service settings:
   * **Name**: `miracle-laundry-backend` (or your preferred name)
   * **Region**: Choose the region closest to you (e.g., *Singapore* or *Frankfurt*)
   * **Branch**: `main`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npm run build
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
4. Scroll down to **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `MONGODB_URI` | *Your MongoDB Atlas connection string from Step 1* |
   | `JWT_SECRET` | `miracle_laundry_super_secure_jwt_secret_key_2026` |
5. Click **Create Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://miracle-laundry-backend.onrender.com`).

---

### Step 3: Deploy Frontend as a Render Static Site
1. In your Render Dashboard, click **New + → Static Site**.
2. Select the same GitHub repository: `https://github.com/startwithsurya112-cmd/Miracle-Laundry.git`.
3. Configure the static site settings:
   * **Name**: `miracle-laundry-pos`
   * **Branch**: `main`
   * **Root Directory**: `frontend`
   * **Build Command**:
     ```bash
     npm install && npm run build
     ```
   * **Publish Directory**: `dist`
4. Add Environment Variable:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://miracle-laundry-backend.onrender.com/api` *(replace with your actual backend URL from Step 2)* |
5. **Configure SPA Client-Side Routing (Important)**:
   * Under your Static Site settings on Render, go to **Redirects / Rewrites**.
   * Add a rewrite rule so React Router page refreshes work properly:
     * **Source**: `/*`
     * **Destination**: `/index.html`
     * **Action**: `Rewrite`
6. Click **Create Static Site**.

---

## 📁 Repository Directory Structure

```
MiracleLaundry/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection & configurations
│   │   ├── controllers/     # Multi-shop, Auth, Order, Customer, Staff, Machine, Expense controllers
│   │   ├── middleware/      # JWT Authentication & Multi-tenant Shop isolation guard
│   │   ├── models/          # Mongoose Schemas (Shop, Admin, Order, Customer, Staff, etc.)
│   │   ├── routes/          # Express API routes
│   │   ├── services/        # WhatsApp gateway integration
│   │   ├── utils/           # PDF & receipt generation utilities
│   │   ├── seed.ts          # Default branch & Super Admin seeder
│   │   └── index.ts         # Main Express entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout (Sidebar, Header with Branch Switcher, BottomNav), Invoices, POS UI
│   │   ├── context/         # AuthContext (Multi-branch state), ThemeContext, ToastContext
│   │   ├── pages/           # ShopsPage (/shops), UsersPage (/users), Dashboard, Orders, Staff, etc.
│   │   ├── services/        # API client with X-Shop-Id header isolation
│   │   ├── types/           # TypeScript interfaces (Shop, UserAccount, Order, etc.)
│   │   ├── App.tsx          # Application routing
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## 📄 License
This project is proprietary and customized for **Miracle Laundry**. All rights reserved.

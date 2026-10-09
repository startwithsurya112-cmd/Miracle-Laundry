# 🧺 Miracle Laundry - Smart POS & Laundry Management System

A modern, production-ready, **Mobile-First** Laundry Shop Management Web Application designed for Miracle Laundry to streamline daily shop operations, order tracking, payment recording, customer history, and digital/printable receipts with QR codes.

---

## 🌟 Key Features

### 📱 Mobile-First POS & Responsive Design
* **Touch-Optimized Bottom Navigation Bar**: Quick 1-tap navigation between Dashboard, POS Order Builder, Orders, Customers, Services, and Reports on mobile devices.
* **Responsive Data Layout**: Automatic transformation between desktop data tables and touch-friendly mobile cards.
* **Express POS Builder**: Fast multi-step order builder with category tabs (Clothes, Dry Clean, Household, Footwear) and `+` / `-` touch steppers.

### 🔐 Single Admin Authentication
* **JWT Authentication**: Protected API routes with `bcryptjs` password hashing.
* **Remember Me**: 30-day extended login token option.
* **Default Admin Credentials**:
  - **Username**: `admin`
  - **Password**: `admin123`

### 📊 Dashboard & Analytics
* **8 Live Key Metrics**: Today's Orders, Pending Orders, In Progress, Ready for Pickup, Delivered Orders, Today's Revenue, Monthly Revenue, Total Customers.
* **Interactive Revenue Charts**: Recharts daily revenue trends & service breakdown pie charts.
* **Pending Delivery Reminders Bar**: Highlighting due/overdue orders with 1-click status bump buttons.

### 🧾 Receipts, Invoices & QR Codes
* **Digital & Printable Invoices**: Thermal receipt layout & standard A4 receipt layout.
* **Dynamic QR Code**: Verification QR code containing order details on every invoice.
* **PDF Export & WhatsApp Sharing**: Instant PDF download & 1-tap WhatsApp receipt sending.

### 💳 Order & Payment Management
* **Order Status Workflow**: `Received` → `Washing` → `Drying` → `Ironing` → `Packing` → `Ready for Pickup` → `Delivered` (or `Cancelled`).
* **Payment Tracking**: Record advance payments, partial payments, and full payments (`Cash`, `UPI`, `Card`). Auto-calculated remaining balance.

### 📊 Reports & CSV Export
* **Business Reports**: Daily/Weekly/Monthly revenue, top spending customers ranking, and service breakdown.
* **CSV Export**: 1-click download of orders and customers data in CSV format.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, QRCode React, jsPDF, html2canvas.
* **Backend**: Node.js, Express.js, TypeScript, Mongoose ODM, JWT, bcryptjs, QRCode.
* **Database**: MongoDB Atlas / Local MongoDB (with offline mock demo fallback support).

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js (v18+)
* npm (v9+)
* MongoDB (Local instance or MongoDB Atlas connection string)

### 1. Run Backend Server
```bash
cd backend
npm install
npm run seed  # Seed initial admin, services, clothing items, and settings
npm run dev   # Starts API server on http://localhost:5000
```

### 2. Run Frontend Web App
```bash
cd frontend
npm install
npm run dev   # Starts Vite dev server on http://localhost:3000
```

Open `http://localhost:3000` in your browser or mobile phone browser and sign in with:
* **Username**: `admin`
* **Password**: `admin123`

---

## 🐳 Docker Support

Run the entire full-stack application and MongoDB database using Docker Compose:
```bash
docker-compose up --build
```

---

## 📂 Project Architecture

```
Laundry-shop/
├── backend/
│   ├── src/
│   │   ├── config/      # DB connection & JWT config
│   │   ├── controllers/ # Auth, Customer, Service, Item, Order, Payment, Report, Setting
│   │   ├── middleware/  # JWT Auth & Error handling
│   │   ├── models/      # Mongoose schemas (Admin, Customer, Service, LaundryItem, Order, Payment, Setting)
│   │   ├── routes/      # Express API routes
│   │   ├── utils/       # Order number & QR generators
│   │   ├── seed.ts      # Database initial seeder
│   │   └── index.ts     # Main Express application
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Layout (Sidebar, Header, BottomNav), UI Badges, InvoiceView, OrderDetailModal
│   │   ├── context/     # AuthContext & ThemeContext
│   │   ├── pages/       # Login, Dashboard, Orders, CreateOrder, Customers, Services, Items, Reports, Settings
│   │   ├── services/    # API client with offline demo fallback
│   │   ├── types/       # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

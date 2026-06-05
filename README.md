# LYFFLOW Frontend

LYFFLOW is a powerful SaaS platform designed to help users automate their social media workflows. By seamlessly integrating with Facebook and Instagram, LYFFLOW enables users to manage knowledge bases, handle media attachments, and orchestrate their social presence directly from an intuitive dashboard.

This repository contains the **React frontend** application for LYFFLOW, built with Vite and TailwindCSS.

## 🚀 Tech Stack

- **Framework:** React 19 + Vite
- **Routing:** React Router v7
- **Styling:** TailwindCSS v3 (with container-queries & forms plugins)
- **Icons:** Lucide React
- **Animations:** LottieFiles

## 📁 Project Structure

```text
src/
├── components/       # Reusable UI components (Navbar, Hero, Footer, etc.)
├── pages/            # Main application views (Dashboard, AdminPanel, GetStarted, etc.)
├── services/         # API abstraction layer (api.js)
├── App.jsx           # Main application routing
└── main.jsx          # React DOM entry point
```

## 🛠️ Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd lyfflow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 🔗 API Connection & Local Proxy

This frontend is designed to consume the Lyfflow FastAPI backend located at `https://api.lyfflow.com`. 

To avoid CORS issues during local development, the Vite configuration (`vite.config.js`) includes a local proxy proxying all `/v1` requests securely to the live backend. 

* **Local dev environment:** API calls are made relatively (e.g. `/v1/auth/facebook/login`) and proxied seamlessly to the live API.
* **Production environment:** If deployed via Vercel, the `vercel.json` rewrite rules handle proxying `/v1` requests directly to the backend.

## 📜 Available Scripts

- `npm run dev` - Starts the Vite development server.
- `npm run build` - Builds the application for production into the `dist/` directory.
- `npm run preview` - Locally preview the production build.
- `npm run lint` - Runs ESLint to check for code issues.

## 🔑 Key Features & Routes
- **`/` (Home):** Landing page with product showcase and hero sections.
- **`/get-started`**: User onboarding and social connection (Facebook OAuth).
- **`/dashboard`**: Main workspace where authenticated users manage social connections, knowledge pages, and media attachments.
- **`/admin`**: Secure admin panel for managing the platform.

## 🌐 Deployment
To deploy this project to production, first run `npm run build`. Then upload the resulting `dist` folder to your VPS, Nginx server, or hosting provider of choice (e.g. Hostinger, AWS, Vercel).

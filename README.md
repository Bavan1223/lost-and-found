# 🎒 Campus Lost & Found — AI-Powered Platform

> A full-stack Node.js + MongoDB + Google Gemini AI platform that helps campus students report, search, and intelligently match lost and found items.

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/Bavan1223/lost-and-found/pipeline.yml?branch=main&label=CI%2FCD&logo=github)](https://github.com/Bavan1223/lost-and-found/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb)](https://www.mongodb.com/atlas)
[![Gemini AI](https://img.shields.io/badge/Google-Gemini%201.5%20Flash-blue?logo=google)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Project Phases](#-project-phases)
  - [Phase 1 — Project Setup & Foundation](#phase-1--project-setup--foundation)
  - [Phase 2 — Database Models & Schema Design](#phase-2--database-models--schema-design)
  - [Phase 3 — REST API Routes & Controllers](#phase-3--rest-api-routes--controllers)
  - [Phase 4 — CI/CD Pipeline with GitHub Actions](#phase-4--cicd-pipeline-with-github-actions)
  - [Phase 5 — Authentication & Gemini AI Integration](#phase-5--authentication--gemini-ai-integration)
- [CI/CD Pipeline Explained](#-cicd-pipeline-explained)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Frontend](#-frontend)

---

## 🌟 Project Overview

The **Campus Lost & Found** platform solves a real campus problem: students lose items daily, and there's no intelligent way to match them with found items. This platform uses:

- **Google Gemini 1.5 Flash** to semantically match lost items to found items with confidence scores
- **AI description enhancement** that turns vague "lost my bag" into a detailed, searchable description
- **JWT-based authentication** to protect private routes
- **Rate limiting** to protect APIs from abuse
- **Automated CI/CD** that tests and deploys on every push

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 20 | JavaScript server runtime |
| **Framework** | Express.js 4 | HTTP server & routing |
| **Database** | MongoDB Atlas + Mongoose | Document storage & ODM |
| **AI** | Google Gemini 1.5 Flash | Item matching & description |
| **Auth** | JWT + bcryptjs | Stateless authentication |
| **Security** | Helmet, CORS, Rate Limiting | HTTP hardening |
| **Logging** | Morgan | HTTP request logging |
| **File Upload** | Multer | Image upload handling |
| **Testing** | Jest + Supertest | API integration testing |
| **CI/CD** | GitHub Actions | Automated test & deploy |
| **Deployment** | Render.com | Cloud hosting |

---

## 📐 Project Phases

### Phase 1 — Project Setup & Foundation

**Goal:** Bootstrap a production-grade Node.js project from scratch.

**What was built:**
- Initialized `package.json` with proper metadata and scripts
- Installed core dependencies: `express`, `mongoose`, `dotenv`, `cors`, `helmet`, `morgan`, `express-rate-limit`
- Created `server.js` as the application entry point
- Configured `.env` for secrets management (never committed to Git)
- Set up `.gitignore` to exclude `node_modules/`, `.env`, `uploads/`
- Created `uploads/` directory with auto-creation logic on server start

**Key concepts learned:**
- Separation of concerns: server config vs business logic
- Environment variable management with `dotenv`
- Why secrets must never be committed to version control

**Files created:**
```
server.js
package.json
.env
.gitignore
```

---

### Phase 2 — Database Models & Schema Design

**Goal:** Define the data structure for Users, Lost Items, and Found Items using Mongoose schemas.

**What was built:**

#### `User` Model (`src/models/User.js`)
- Fields: `name`, `email`, `password`, `studentId`, `location`, `avatar`, `role`, `reportCount`
- **Password hashing**: Pre-save Mongoose hook automatically hashes passwords using `bcryptjs` (12 salt rounds — production standard)
- **Security**: `password` field has `select: false` — it's never returned in queries by default
- **Email validation**: Regex pattern enforces valid email format
- **Role-based access**: `enum: ['student', 'admin']` limits roles
- **toJSON transform**: Strips `password` and `__v` from all API responses

#### `LostItem` Model (`src/models/LostItem.js`)
- Fields: `reportedBy` (ref→User), `title`, `description`, `enhancedDescription`, `category`, `location`, `dateLost`, `image`, `status`, `contactEmail`, `contactPhone`, `aiMatchScore`, `matchedFoundItem`, `tags`, `reward`
- **Status lifecycle**: `active → matched → resolved`
- **MongoDB indexes**: Created on `status`, `category`, `reportedBy`, `dateLost` for query performance
- **Full-text search index**: On `title` + `description` for keyword search

#### `FoundItem` Model (`src/models/FoundItem.js`)
- Similar structure to LostItem, adapted for found item reporting
- Additional fields for storage location and handoff status

**Key concepts learned:**
- Mongoose schema design and validation
- MongoDB relationships using `ObjectId` references and `.populate()`
- One-way password hashing (bcrypt cannot be reversed)
- Database indexes for query performance optimization

**Files created:**
```
src/models/User.js
src/models/LostItem.js
src/models/FoundItem.js
src/config/db.js
```

---

### Phase 3 — REST API Routes & Controllers

**Goal:** Build all CRUD API endpoints following REST conventions.

**Architecture pattern used:**
```
Request → Route (URL mapping) → Middleware → Controller (business logic) → Model (DB) → Response
```

**What was built:**

#### Auth Routes (`/api/auth`)
| Method | Endpoint | Access | Action |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new student |
| POST | `/api/auth/login` | Public | Login & get JWT token |
| GET | `/api/auth/me` | Private | Get current user profile |

#### Lost Item Routes (`/api/lost`)
| Method | Endpoint | Access | Action |
|---|---|---|---|
| GET | `/api/lost` | Public | Get all lost items (paginated) |
| GET | `/api/lost/:id` | Public | Get single lost item |
| POST | `/api/lost` | Private | Report a new lost item |
| PUT | `/api/lost/:id` | Private (owner) | Update lost item |
| DELETE | `/api/lost/:id` | Private (owner/admin) | Delete lost item |

#### Found Item Routes (`/api/found`)
| Method | Endpoint | Access | Action |
|---|---|---|---|
| GET | `/api/found` | Public | Get all found items |
| GET | `/api/found/:id` | Public | Get single found item |
| POST | `/api/found` | Private | Report a new found item |
| PUT | `/api/found/:id` | Private (owner) | Update found item |
| DELETE | `/api/found/:id` | Private (owner/admin) | Delete found item |

#### AI Routes (`/api/ai`)
| Method | Endpoint | Access | Action |
|---|---|---|---|
| POST | `/api/ai/match` | Private | Match lost item to found items |
| GET | `/api/ai/suggestions/:id` | Private | Get top 3 match suggestions |
| POST | `/api/ai/describe` | Private | Enhance item description with AI |
| POST | `/api/ai/ask` | Private | Ask AI a question |

**Key concepts learned:**
- REST API design principles (correct HTTP verbs and status codes)
- Query filtering, sorting, and pagination
- Authorization patterns: owner-only updates, role-based deletes
- Populating MongoDB references with `.populate()`

**Files created:**
```
src/routes/auth.js
src/routes/lost.js
src/routes/found.js
src/routes/ai.js
src/controllers/authController.js
src/controllers/lostController.js
src/controllers/foundController.js
src/controllers/aiController.js
src/middleware/auth.js
```

---

### Phase 4 — CI/CD Pipeline with GitHub Actions

**Goal:** Automate testing and deployment so every code push is validated before it reaches production.

**What was built:**

#### `.github/workflows/pipeline.yml`

A two-job GitHub Actions pipeline:

**Job 1: `test`** — Runs on every push to `main` or `develop`, and on all PRs targeting `main`
1. Checks out the code onto an Ubuntu virtual machine
2. Installs Node.js 20 (with npm cache for speed)
3. Runs `npm ci` (clean install — faster and stricter than `npm install`)
4. Runs the full test suite (`npm test`) with secrets injected as environment variables

**Job 2: `deploy`** — Only runs after `test` passes AND we're on `main` branch
1. Triggers a Render.com deployment via webhook (HTTP POST to deploy hook URL)
2. This causes Render to pull the latest code and restart the server

**Why CI/CD matters:**
- Without CI: broken code can reach production
- With CI: the pipeline acts as a gatekeeper — bad code is caught automatically
- Secrets (MONGODB_URI, JWT_SECRET, GEMINI_API_KEY) are stored in GitHub Secrets, never in code

**Pipeline flow:**
```
git push → GitHub detects push → Ubuntu VM spins up
         → npm ci → npm test
         → [If tests pass & branch=main] → Trigger Render deploy
         → New version is live
```

**Files created:**
```
.github/workflows/pipeline.yml
tests/auth.test.js
```

---

### Phase 5 — Authentication & Gemini AI Integration

**Goal:** Implement JWT-based authentication, rate limiting, and full Google Gemini AI features.

**What was built:**

#### JWT Authentication (`src/middleware/auth.js`)
- **How it works**: Client sends `Authorization: Bearer <token>` header with every protected request
- **Token structure**: `header.payload.signature` (base64 encoded)
  - Header: algorithm type (`HS256`)
  - Payload: `{ id: userId, exp: expiryTime }`
  - Signature: HMAC of header+payload using `JWT_SECRET`
- **Verify step**: `jwt.verify()` checks the signature AND expiry — no database lookup needed
- **Security**: `req.user` is populated after verification, available to all downstream handlers
- **Token expiry**: 7 days (configurable via `JWT_EXPIRES_IN`)

#### Rate Limiting (3 tiers in `server.js`)
| Limiter | Window | Max Requests | Applied To |
|---|---|---|---|
| **Global** | 15 min | 100 | All routes |
| **Auth** | 15 min | 10 | `/api/auth` |
| **AI** | 1 hour | 30 | `/api/ai` |

#### Google Gemini AI (`src/controllers/aiController.js`)
- **Model**: `gemini-1.5-flash` — fast, high quota, free tier
- **Singleton pattern**: client initialized once, reused across requests

**Feature 1: Item Matching (`POST /api/ai/match`)**
- Fetches the lost item from DB
- Fetches up to 100 recent found items (same category first)
- Sends structured prompt to Gemini with both sets of data
- Gemini scores each found item 0–100 and returns top 3 matches with reasons
- Matches are enriched with full found item details and reporter info

**Feature 2: Description Enhancement (`POST /api/ai/describe`)**
- Takes a rough description from the student (e.g., "lost my bag near library")
- Gemini expands it with likely details, adds searchable keywords, and gives tips
- Enhanced description stored in `enhancedDescription` field for better search

**Feature 3: AI Q&A (`POST /api/ai/ask`)**
- Students can ask general questions about campus lost & found
- AI stays on-topic via system prompt constraints

**MongoDB Issue Resolved:**
- Solved persistent DNS SRV lookup failures by switching to direct connection string format
- DB guard middleware (`requireDB`) ensures routes return clear 503 errors if MongoDB is down, instead of crashing

**Key concepts learned:**
- JWT stateless authentication vs session-based auth
- Prompt engineering for structured JSON output from LLMs
- Parsing AI responses safely (handling markdown code block wrappers)
- Rate limiting strategies for API protection
- Resilient server startup (server starts immediately, DB connects async)

**Files created/updated:**
```
src/controllers/aiController.js  (full Gemini integration)
src/controllers/authController.js (register, login, getMe)
src/middleware/auth.js           (JWT protect middleware)
server.js                        (rate limiting, DB guard, startup resilience)
```

---

## 🔁 CI/CD Pipeline Explained

```yaml
# Triggered on push to main/develop or PR to main
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:                          # JOB 1: Always runs
    runs-on: ubuntu-latest
    steps:
      - Checkout Code            # Gets your code into the VM
      - Setup Node.js 20         # Installs Node with npm cache
      - npm ci                   # Clean install dependencies
      - npm test                 # Runs Jest test suite

  deploy:                        # JOB 2: Only after test passes on main
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - curl POST render_hook    # Triggers Render.com deployment
```

**GitHub Secrets needed:**
| Secret | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `RENDER_DEPLOY_HOOK` | Render.com webhook URL |

---

## 📡 API Reference

### Base URL
```
Development: http://localhost:5000
Production:  https://your-app.onrender.com
```

### Authentication Header
```
Authorization: Bearer <your_jwt_token>
```

### Health Check
```http
GET /api/health
```

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Bavan Kumar",
  "email": "bavan@campus.edu",
  "password": "securepass123",
  "studentId": "STU2024"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "bavan@campus.edu",
  "password": "securepass123"
}
```

### Report Lost Item
```http
POST /api/lost
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Black AirPods Pro",
  "description": "Lost near the library entrance",
  "category": "electronics",
  "location": "Main Library",
  "dateLost": "2024-05-28"
}
```

### AI Match
```http
POST /api/ai/match
Authorization: Bearer <token>
Content-Type: application/json

{
  "lostItemId": "664abc123def456"
}
```

### AI Describe
```http
POST /api/ai/describe
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "AirPods",
  "roughDescription": "white earbuds, lost in library",
  "category": "electronics"
}
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Google AI Studio account (for Gemini API key)

### Installation

```bash
# Clone the repository
git clone https://github.com/Bavan1223/lost-and-found.git
cd lost-and-found

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Fill in your values in .env

# Run in development mode (auto-restarts on file changes)
npm run dev

# Run tests
npm test

# Run with coverage report
npm run test:coverage
```

### Environment Setup
See [Environment Variables](#-environment-variables) section below.

---

## 📁 Project Structure

```
lost-and-found/
├── .github/
│   └── workflows/
│       └── pipeline.yml          # GitHub Actions CI/CD
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection + lifecycle events
│   ├── controllers/
│   │   ├── authController.js     # register, login, getMe
│   │   ├── lostController.js     # CRUD for lost items
│   │   ├── foundController.js    # CRUD for found items
│   │   └── aiController.js       # Gemini AI features
│   ├── middleware/
│   │   └── auth.js               # JWT protect middleware
│   ├── models/
│   │   ├── User.js               # Student/User schema
│   │   ├── LostItem.js           # Lost item schema
│   │   └── FoundItem.js          # Found item schema
│   ├── routes/
│   │   ├── auth.js               # Auth route definitions
│   │   ├── lost.js               # Lost item routes
│   │   ├── found.js              # Found item routes
│   │   └── ai.js                 # AI feature routes
│   └── utils/                    # Shared utilities
├── tests/
│   └── auth.test.js              # Jest integration tests
├── uploads/                      # Uploaded item images (gitignored)
├── frontend/
│   └── index.html                # Frontend web application
├── server.js                     # Application entry point
├── package.json
├── .env                          # Secrets (gitignored)
├── .gitignore
└── README.md
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/campus-lost-found?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=AIzaSy_your_key_here

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:4000
```

> ⚠️ **Never commit `.env` to version control.** It's already in `.gitignore`.

---

## 🖥 Frontend

A modern, responsive frontend is included at `frontend/index.html`.

Open it directly in a browser — no build step required. It connects to the backend API at `http://localhost:5000`.

**Features:**
- 🔐 Register & Login with JWT authentication
- 📋 Browse all lost and found items
- ➕ Report new lost/found items
- 🤖 AI-powered item matching and description enhancement
- 💬 Ask the AI assistant questions
- 📊 Real-time health check status
- 🌙 Dark mode, glassmorphism design

---

## 🗺 Roadmap (Upcoming Phases)

- **Phase 6** — Image upload & processing with Multer + cloud storage
- **Phase 7** — Email notifications (Nodemailer) when a match is found
- **Phase 8** — Admin dashboard with analytics
- **Phase 9** — Production deployment with monitoring

---

## 👤 Author

**Bavan** — Building this as a learning project to master full-stack development with AI integration.

---

## 📄 License

MIT — free to use, modify, and distribute.

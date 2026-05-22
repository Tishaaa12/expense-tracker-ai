# AI-Powered Fullstack Expense Tracker

A production-ready, full-stack Expense Tracker web application built using **Next.js 16 (App Router)**, **Tailwind CSS**, **MongoDB + Mongoose**, and **Gemini 2.5 Flash**. The application features custom JWT-based authentication, interactive charts, budget alerts, and an AI-powered text parser to auto-fill expense entries.

## 🔗 Live Application
- **Live Demo Link**: [https://expense-tracker-ai-theta-seven.vercel.app](https://expense-tracker-ai-theta-seven.vercel.app)

---

## 🏗️ Architecture & Folder Structure

The project is structured with a clean separation of concerns, ensuring modularity, security, and scalability:

```text
expense-tracker-ai/
├── src/
│   ├── app/                      # Next.js App Router (Pages, Layouts & API routes)
│   │   ├── api/                  # Backend REST API Routes
│   │   │   ├── ai/               # AI auto-fill extraction endpoint
│   │   │   ├── auth/             # Custom JWT Authentication endpoints
│   │   │   ├── budgets/          # Category budget limits endpoint
│   │   │   └── expenses/         # CRUD endpoints for expenses
│   │   ├── login/                # Client login page
│   │   ├── register/             # Client registration page
│   │   ├── expenses/             # Client expense management logs
│   │   ├── layout.tsx            # Global layout & Auth context wrapper
│   │   ├── page.tsx              # Dashboard home page (Charts & Budgets)
│   │   └── globals.css           # Styling with Tailwind CSS v4 import
│   ├── components/               # Reusable React components (Navbar, etc.)
│   ├── context/                  # AuthContext React provider (auth state management)
│   ├── lib/                      # Core utility functions (dbConnect, jwt helper)
│   └── models/                   # Mongoose Database Schemas (User, Expense)
├── .env.example                  # Environment variables template
├── package.json                  # NPM dependencies & scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

- **Separation of Concerns**: Page routes are clearly isolated from raw business logic, database queries, and security helpers.
- **Component Design**: UI components utilize modern icons (`lucide-react`) and follow a sleek dark-themed aesthetic with absolute visual consistency.

---

## 🛣️ API Design (RESTful Routes)

The backend exposes the following API routes:

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & issue HttpOnly JWT cookie | No |
| `POST` | `/api/auth/logout` | Clear the JWT session cookie | Yes |
| `GET` | `/api/auth/me` | Fetch the current user profile & budget settings | Yes |
| `GET` | `/api/expenses` | Retrieve user expenses (supports category & month filtering) | Yes |
| `POST` | `/api/expenses` | Log a new expense | Yes |
| `PUT` | `/api/expenses/[id]` | Update an existing expense | Yes |
| `DELETE` | `/api/expenses/[id]` | Remove an expense | Yes |
| `POST` | `/api/budgets` | Set or update category budget limits | Yes |
| `POST` | `/api/ai/extract` | Extract amount, category, date, and note from raw text | Yes |

- **Error Handling**: Standard HTTP status codes are returned (`400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`). All errors are wrapped in descriptive JSON responses (`{ error: "..." }`).
- **Route Protection**: Implemented via Next.js Edge Middleware (`src/middleware.ts`), verifying the presence and integrity of the JWT session before executing API route handlers.

---

## 🗄️ Database & Schema Design

Powered by **MongoDB** and mapped using **Mongoose**:

### User Schema (`src/models/User.ts`)
- `email`: Unique, lowercase, and trimmed string.
- `password`: Hashed using `bcryptjs` (never stored in plain text).
- `budgets`: Key-value map representing monthly spending limits for each category.

### Expense Schema (`src/models/Expense.ts`)
- `userId`: Reference to the owner (`User` collection) to prevent data leak. Indexed for quick query lookups.
- `amount`: Number representing the expense value.
- `category`: String representing the expense category.
- `date`: Date object representing the transaction date.
- `note`: Optional string for transaction details.

---

## 🤖 AI Auto-Fill Integration

Uses the official `@google/generative-ai` SDK and the **Gemini 2.5 Flash** model:
- **Strict Schema Enforcement**: Utilizes `responseMimeType: "application/json"` with Mime Schema mapping to enforce structured responses directly from the LLM, eliminating syntax errors.
- **Context Awareness**: The prompt automatically injects the current date, allowing Gemini to correctly map relative dates (e.g. "yesterday", "last Friday") or handle missing year declarations (e.g. "on May 15").
- **Aesthetic Confirmation Flow**: The frontend auto-populates the standard expense logging modal, allowing the user to review, edit, and confirm the AI-extracted values before anything is saved to the database.

---

## 🔒 Auth Security

- **Password Hashing**: Passwords are securely hashed with a salt factor of 10 using `bcryptjs` during registration.
- **Secure JWT Storage**: The signed JWT payload is stored in a cookie configured with `httpOnly: true`, `secure: true` (in production), and `sameSite: "strict"`. This mitigates XSS (Cross-Site Scripting) and CSRF (Cross-Site Request Forgery) attacks.
- **No Exposed Secrets**: Sensitive properties (e.g., password fields) are excluded from server responses using Mongoose projections (`select('-password')`). All sensitive keys are loaded strictly from environment variables.

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v18.x or later)
- MongoDB database (local or MongoDB Atlas cluster)
- Google Gemini API Key

### Steps

1. **Clone and Navigate**:
   ```bash
   git clone https://github.com/Tishaaa12/expense-tracker-ai
   cd expense-tracker-ai
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root folder (using `.env.example` as a template):
   ```bash
   cp .env.example .env.local
   ```
   Provide your `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY`.

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with the application.

5. **Build for Production**:
   Validate code correctness and build the production-ready package:
   ```bash
   npm run build
   ```

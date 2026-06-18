# Vendor Onboarding & Compliance Portal - Day 1 Architecture & Setup

## 1. System Architecture
This project implements a decoupled Client-Server architecture:
- **Frontend**: A React single-page application (SPA) created via Vite. It handles the user interface, role-based routing, and client-side form validation. It uses `axios` for HTTP communication with the backend.
- **Backend**: A Flask RESTful API. It provides structured endpoints for user registration, login, and simple profile/dashboard fetching using JWT (JSON Web Tokens) for stateless authentication.
- **Database**: SQLite (managed via SQLAlchemy) is used for the Day 1 baseline. It allows for an easy "Zero Configuration" setup. The schema is defined in python models and maps to the local `.db` file.
- **Future Integration (Day 2+)**: AWS S3 will be integrated into the backend. The Flask API will generate presigned URLs or handle multipart form uploads to securely stream documents to an S3 bucket without bloating the local database. A reference string pointing to the document URL will be stored in SQLite/PostgreSQL.

### Interactions:
1. **Auth Flow**: Frontend sends `POST /login` with credentials. Backend verifies against SQLite, signs a JWT using a secret key, and returns the token and `role` to the client.
2. **Access Control**: React stores the token in `localStorage` and routes the user to their designated dashboard (`/vendor-dashboard`, `/finance-dashboard`, etc.) based on the returned role. Subsequent API calls to protected routes include the token in the `Authorization: Bearer <token>` header.

---

## 2. Project Folder Structure
A clean, production-ready structure:
```text
vendour onboarding/
├── backend/
│   ├── app.py             # Main Flask application and API routes
│   ├── config.py          # Configuration settings (DB URI, Secrets)
│   ├── models.py          # SQLAlchemy Database Models (Users Table)
│   └── requirements.txt   # Python Dependencies
└── frontend/
    ├── package.json       # Node.js Dependencies
    ├── index.html
    ├── vite.config.js     # Vite configuration
    └── src/
        ├── App.jsx        # Routing configuration & Protected Routes
        ├── main.jsx       # React entry point
        └── pages/
            ├── Login.jsx       
            ├── Register.jsx          
            ├── VendorDashboard.jsx       
            ├── ComplianceDashboard.jsx   
            ├── FinanceDashboard.jsx      
            └── AdminDashboard.jsx        
```

---

## 3. Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js v16+
- npm (Node Package Manager)

### Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. (Optional but recommended) Create and activate a custom Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows: venv\Scripts\activate
   # On Mac/Linux: source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Flask server (it will automatically create `vendor_portal.db` containing the Users table on initial run):
   ```bash
   python app.py
   ```
   *The backend will now be running on `http://localhost:5000`*

### Frontend Setup
1. Open a *new* terminal window and navigate to the `frontend` directory.
   ```bash
   cd frontend
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically run on `http://localhost:5173`*

### 4. Testing the Application
1. Navigate to the frontend URL in your browser. It will redirect you to `/login`.
2. Click **Register here** to create your first user.
3. Fill in the fields and select a role (e.g., "Vendor" or "Finance Team").
4. Submit the form, then login with the new credentials.
5. You will securely be routed to the respective Dashboard based on the role selected.

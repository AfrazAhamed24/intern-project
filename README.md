# 🚀 Vendor Onboarding & Compliance Portal

<p align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" width="60" height="60"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/flask/flask-original.svg" width="60" height="60"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original.svg" width="60" height="60"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" width="60" height="60"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" width="80" height="60"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg" width="60" height="60"/>
</p>

<h3 align="center">
Enterprise SaaS Platform for Vendor Registration, OCR-Based Compliance Validation, Finance Approval Workflows, and Audit Management
</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Frontend-React_19-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Backend-Flask_3.0-black?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/OCR-Tesseract-purple?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Cloud-AWS_S3-orange?style=for-the-badge"/>
</p>

---

# 🌟 Overview

The **Vendor Onboarding & Compliance Portal** is a full-stack enterprise workflow management platform designed to digitize and automate the complete vendor onboarding lifecycle.

The platform eliminates manual onboarding processes involving spreadsheets, emails, document exchanges, and fragmented approval chains by providing a centralized, secure, and scalable solution.

Organizations can efficiently manage vendor registrations, automate compliance verification through OCR, streamline finance approvals, maintain audit trails, and gain real-time visibility into onboarding progress.

---

# 🎯 Business Impact

### Problems Solved

* 📧 Vendor information scattered across emails
* 📊 Spreadsheet-based tracking
* 🔍 Manual GST and PAN verification
* ⏳ Long onboarding cycles
* 🔁 Duplicate vendor registrations
* 📋 Missing audit trails
* 💰 Delayed finance approvals
* 📉 Limited workflow visibility

### Benefits Delivered

✅ Centralized Vendor Registration

✅ OCR-Powered Document Verification

✅ Compliance Automation

✅ Finance Approval Workflow

✅ Audit Logging & Tracking

✅ Real-Time Status Monitoring

✅ Cloud-Based Document Storage

✅ Enterprise-Ready Architecture

---

# 🏗️ Architecture

```text
┌───────────────────────────────┐
│        React Frontend         │
│   React 19 + Vite + RBAC      │
└───────────────┬───────────────┘
                │
                │ Axios API Calls
                ▼
┌───────────────────────────────┐
│         Flask API             │
│ JWT • OCR • Workflows • RBAC  │
└──────────┬──────────┬─────────┘
           │          │
           ▼          ▼

 ┌───────────────┐  ┌───────────────┐
 │   MongoDB     │  │ OCR Engine    │
 │               │  │ Tesseract     │
 │ Users         │  │ PyMuPDF       │
 │ Vendors       │  │ Pillow        │
 │ Documents     │  └───────────────┘
 │ Audit Logs    │
 └───────┬───────┘
         │
         ▼

 ┌─────────────────┐
 │     AWS S3      │
 │ Document Store  │
 └─────────────────┘
```

---

# ⚙️ Technology Stack

| Category             | Technology          |
| -------------------- | ------------------- |
| 🎨 Frontend          | React 19 + Vite 8   |
| 🎯 Styling           | Tailwind CSS 4      |
| 🎨 Icons             | Lucide React        |
| 🔄 Routing           | React Router DOM v7 |
| 🌐 API Communication | Axios               |
| ⚙️ Backend           | Flask 3.0           |
| 🔐 Authentication    | JWT                 |
| 🗄️ Database         | MongoDB (PyMongo)   |
| 🤖 OCR Engine        | Tesseract OCR       |
| 📄 PDF Processing    | PyMuPDF             |
| 🖼️ Image Processing | Pillow              |
| ☁️ Cloud Storage     | AWS S3              |
| 🚀 Deployment        | AWS                 |
| 🔧 Version Control   | Git & GitHub        |

---

# 👥 Role-Based Access Control

## 🏢 Vendor

* Create Profile
* Upload Documents
* Submit for Review
* Track Status
* View OCR Results

---

## 🛡️ Compliance Officer

* Review Vendor Queue
* Validate OCR Results
* Compare Profile vs Document Data
* Approve Vendors
* Reject Vendors
* Request Corrections

---

## 💰 Finance Team

* Review Compliance Approved Vendors
* Validate Financial Information
* Verify Banking Details
* Approve Finance Requests
* Reject Finance Requests

---

## ⚙️ Super Admin

* Monitor Entire Workflow
* Manage Vendors
* Manage Statuses
* Access Audit Logs
* Track Platform Analytics

---

# 🤖 OCR Verification Engine

One of the platform's core capabilities.

The OCR module automatically extracts data from uploaded vendor documents and compares it against submitted profile information.

### Supported Documents

| Document              |
| --------------------- |
| GST Certificate       |
| PAN Card              |
| Trade License         |
| Bank Proof            |
| Insurance Certificate |

### OCR Workflow

```text
Document Upload
       ↓
OCR Processing
       ↓
Text Extraction
       ↓
GST/PAN Detection
       ↓
Field Matching
       ↓
Match / Mismatch Analysis
       ↓
Compliance Review
```

### OCR Features

✅ Automatic Text Extraction

✅ GST Validation

✅ PAN Validation

✅ OCR Reprocessing

✅ Match/Mismatch Detection

✅ Compliance Comparison Dashboard

---

# 🔄 Vendor Lifecycle Workflow

```text
Vendor Registration
        ↓
Profile Creation
        ↓
Document Upload
        ↓
OCR Validation
        ↓
Submit For Review
        ↓
Compliance Review
        ↓
Finance Approval
        ↓
Admin Activation
        ↓
ACTIVE VENDOR
```

---

# 🌟 Core Features

## 🔐 Authentication

* JWT Login
* User Registration
* Role-Based Access Control
* Protected Routes

## 🏢 Vendor Dashboard

* Workflow Progress Timeline
* Document Summary
* OCR Status Tracking
* Activity Feed
* Readiness Indicators

## 📄 Document Management

* Upload Documents
* Delete Documents
* OCR Status Badges
* Validation Checks

## 🛡️ Compliance Dashboard

* Vendor Review Queue
* OCR Comparison Tables
* Approve / Reject / Correction Workflow

## 💰 Finance Dashboard

* Finance Approval Queue
* Compliance Verification
* Financial Validation Checklist

## ⚙️ Admin Dashboard

* Executive Analytics
* Vendor Management
* Audit Logs
* Operational Metrics

---

# 📊 Analytics & Monitoring

### Executive Metrics

* Total Vendors
* Active Vendors
* Draft Vendors
* Under Review Vendors
* Approved Vendors
* Rejected Vendors

### Operational Metrics

* Approval Rate
* Rejection Rate
* Pending Reviews
* Finance Queue
* OCR Ready Documents

---

# 📋 Audit Logging

Every major system activity is recorded.

Tracked Events:

* Login Activities
* Vendor Registration
* Profile Updates
* Document Uploads
* OCR Processing
* Compliance Actions
* Finance Approvals
* Admin Actions

---

# ☁️ AWS Cloud Integration

### Implemented

✅ AWS S3 Document Storage

✅ Secure File Uploads

✅ Cloud-Based Document Retrieval

✅ Reduced Database Storage Overhead

### Benefits

* Scalability
* Reliability
* Durability
* Cost Efficiency
* Enterprise Readiness

---

# 🎨 UI/UX Enhancements

### Modern Design System

* 🌙 Dark Mode Support
* 📱 Mobile Responsive Design
* 🎯 Lucide SVG Icons
* ⚡ Fast Navigation
* ♿ Accessibility Improvements
* 🎨 Tailwind Design Tokens

### Engineering Improvements

* Centralized API Layer
* Environment-Based Configuration
* Reusable Components
* CSS Optimization
* Modular Architecture

---

# 📁 Project Structure

```text
vendor-onboarding-portal/

├── backend/
│   ├── app.py
│   ├── config.py
│   ├── routes/
│   ├── services/
│   │   └── ocr_service.py
│   ├── models/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── services/
│   │   └── lib/
│   └── package.json
│
├── docs/
│   ├── Architecture.md
│   ├── API_Documentation.md
│   ├── Setup_Guide.md
│   └── Screenshots/
│
├── README.md
└── .gitignore
```

---

# 📈 Project Status

| Module              | Status      |
| ------------------- | ----------- |
| Authentication      | ✅ Completed |
| Vendor Profile      | ✅ Completed |
| Document Upload     | ✅ Completed |
| OCR Verification    | ✅ Completed |
| Compliance Workflow | ✅ Completed |
| Finance Workflow    | ✅ Completed |
| Admin Dashboard     | ✅ Completed |
| Audit Logs          | ✅ Completed |
| AWS S3 Integration  | ✅ Completed |
| UI/UX Modernization | ✅ Completed |
| Cloud Deployment    | ✅ Completed |

---

# 📸 Screenshots

## Login Page

![Login Page](screenshots/Screenshot%202026-06-19%20082627.png)

## Vendor Dashboard

![Vendor Dashboard](screenshots/Screenshot%202026-06-19%20082711.png)

## Vendor Documents

![Vendor Documents](screenshots/Screenshot%202026-06-19%20082725.png)

## Admin Dashboard

![Admin Dashboard](screenshots/Screenshot%202026-06-19%20093910.png)

## Vendor Management

![Vendor Management](screenshots/Screenshot%202026-06-19%20093931.png)

## Finance Dashboard

![Finance Dashboard](screenshots/Screenshot%202026-06-19%20094024.png)

## Finance Approval Workflow

![Finance Approval Workflow](screenshots/Screenshot%202026-06-19%20094039.png)

## Compliance Dashboard

![Compliance Dashboard](screenshots/Screenshot%202026-06-19%20094517.png)

## Compliance Review Modal

![Compliance Review Modal](screenshots/Screenshot%202026-06-19%20094536.png)

---

# 🚀 Future Enhancements

### AI & Automation

* AI-Based Vendor Risk Scoring
* Compliance Recommendation Engine
* Automated GST Verification
* Automated PAN Verification

### Enterprise Features

* Email Notifications
* Workflow Escalation Rules
* Multi-Tenant Support
* Advanced Reporting

---

# 👨‍💻 Author

## Afraz Ahamed K. M.

**B.E. Computer Science & Engineering (AI & ML)**

🏫 M. Kumarasamy College of Engineering

💻 GitHub: https://github.com/AfrazAhamed24

---

# 🎯 Project Vision

To build a secure, scalable, intelligent, and cloud-native vendor management ecosystem that transforms traditional onboarding workflows into a transparent, automated, and audit-ready digital experience.

---

<p align="center">
  <h3 align="center">⭐ If you found this project useful, consider starring the repository ⭐</h3>
</p>

<p align="center">
Built with ❤️ using React • Flask • MongoDB • OCR • AWS S3
</p>

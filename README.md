<div align="center">

#  Vendor Onboarding & Compliance Portal

### Transforming Manual Vendor Management into a Secure, Auditable, and Scalable Digital Workflow

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active_Development-success" />
  <img src="https://img.shields.io/badge/Sprint-10_Days-blue" />
  <img src="https://img.shields.io/badge/Roles-4-purple" />
  <img src="https://img.shields.io/badge/Workflow_Stages-5-orange" />
</p>

</div>

---

# 📖 Overview

The Vendor Onboarding & Compliance Portal is a full-stack enterprise workflow application designed to digitize and automate the complete vendor onboarding lifecycle.

Instead of relying on spreadsheets, emails, WhatsApp messages, and manual follow-ups, organizations can use a centralized platform where vendors register, submit company information, undergo compliance review, and track approval status in real time.

The platform improves transparency, reduces onboarding delays, prevents duplicate registrations, and creates an auditable approval workflow.

---

# 🎯 Business Problem

Organizations commonly face:

- 📧 Vendor data scattered across emails and documents
- 🔍 Manual verification processes
- ⏳ Long onboarding cycles
- 🔁 Duplicate vendor registrations
- 📊 Lack of visibility into application status
- 📋 Missing audit trails
- 💰 Delays in finance approval and payment processing

---

# 💡 Solution

This platform centralizes the onboarding workflow into a secure web application.

### Key Benefits

✅ Centralized Vendor Registration

✅ Real-Time Status Tracking

✅ Compliance Review Workflow

✅ Role-Based Access Control

✅ Secure Authentication

✅ Audit-Friendly Process

✅ Future AWS Cloud Integration

---

# 🏗️ System Architecture

```text
                     ┌─────────────────────┐
                     │      Vendor         │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │   React Frontend    │
                     └──────────┬──────────┘
                                │ Axios
                                ▼
                     ┌─────────────────────┐
                     │    Flask Backend    │
                     │ JWT + RBAC + APIs   │
                     └──────────┬──────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
      ┌──────────────────┐         ┌──────────────────┐
      │     MongoDB      │         │      AWS S3      │
      │ Users & Vendors  │         │ Vendor Documents │
      └──────────────────┘         └──────────────────┘
```

---

# ✨ Core Features

## 🔐 Authentication

- User Registration
- Secure Login
- Password Hashing
- JWT Authentication

## 👥 Role-Based Access Control

- Vendor
- Compliance Officer
- Finance Team
- Super Admin

## 🏢 Vendor Management

- Create Profile
- Update Profile
- Track Status
- Manage Company Information

## ✅ Compliance Workflow

- View Vendor Queue
- Review Vendor Details
- Approve Vendors
- Reject Vendors
- Request Corrections

## 📊 Status Tracking

- Draft
- Under Review
- Approved
- Rejected
- Correction Requested

---

# 👥 User Roles

| Role | Responsibility |
|--------|---------------|
| 🏢 Vendor | Register, create profile, track status |
| ✅ Compliance Officer | Review and approve vendors |
| 💰 Finance Team | Validate financial information |
| ⚙️ Super Admin | Manage platform and workflows |

---

# 🔄 Workflow

```text
Vendor Registration
        ↓
Login & JWT Authentication
        ↓
Create Vendor Profile
        ↓
Status = Draft
        ↓
Compliance Review
        ↓
 ┌──────────┬──────────┬─────────────┐
 │          │          │             │
 ▼          ▼          ▼             │
Approve   Reject   Correction        │
 │          │          │             │
 ▼          ▼          ▼             │
Status   Status   Vendor Updates ◄───┘
Updated  Updated      Profile
```

---

# 🗄️ Database Collections

## Users

- Full Name
- Email
- Password Hash
- Role
- Status
- Created At

## Vendors

- Company Name
- GST Number
- PAN Number
- Contact Person
- Address
- Region
- Category
- Status

---

# 🛠️ Technology Stack

| Layer | Technology |
|---------|-------------|
| Frontend | React.js |
| Backend | Flask |
| Database | MongoDB |
| Authentication | JWT |
| Version Control | Git & GitHub |
| Cloud Storage | AWS S3 (Planned) |
| Deployment | AWS EC2 (Planned) |

---

# 📈 Development Progress

| Module | Status |
|----------|---------|
| Authentication | ✅ Complete |
| MongoDB Integration | ✅ Complete |
| JWT Security | ✅ Complete |
| Vendor Profile Module | ✅ Complete |
| Compliance Workflow | ✅ Complete |
| Document Upload | 🚧 In Progress |
| AWS S3 Integration | 🚧 In Progress |
| Finance Workflow | ⏳ Planned |
| Deployment | ⏳ Planned |

---

# 🚀 Future Enhancements

## ☁️ Cloud Features

- AWS S3 Document Storage
- AWS EC2 Deployment
- Presigned URL Uploads

## 📧 Notification System

- Vendor Submission Alerts
- Approval Notifications
- Rejection Notifications
- Correction Request Emails

## 🤖 AI-Assisted Compliance

- OCR-Based Document Extraction
- GST Validation
- PAN Validation
- Profile vs Document Comparison
- Vendor Risk Scoring
- Compliance Recommendation Engine

---

# 📸 Screenshots

### Login Page

(Add Screenshot)

### Vendor Dashboard

(Add Screenshot)

### Compliance Dashboard

(Add Screenshot)

### Vendor Profile Module

(Add Screenshot)

---

# 👨‍💻 Author

## Afraz Ahamed K M

Computer Science & Engineering

M. Kumarasamy College of Engineering

GitHub:
https://github.com/AfrazAhamed24

---

# 🎯 Project Goal

To transform a traditionally manual vendor onboarding process into a centralized, transparent, secure, and scalable enterprise workflow platform that improves compliance efficiency, reduces onboarding delays, and provides real-time visibility to all stakeholders.

---

<div align="center">

### ⭐ If you like this project, consider starring the repository.

Built with ❤️ using React, Flask, MongoDB, JWT & AWS

</div>

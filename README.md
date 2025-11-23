# Ethical AI Banking System: Building Trust & Transparency

## Overview

This project is a **Proof of Concept (PoC)** for an **Ethical AI Framework in Banking**. It addresses the critical need for **transparency, accountability, and user control** in automated financial decision-making.

Instead of a typical “black box” that simply approves or denies loans, this system:

- **Explains Decisions**  
  Uses **SHAP (SHapley Additive exPlanations)** to tell users *why* a decision was made in plain English.

- **Empowers Users**  
  Provides **granular consent controls**, allowing users to see how withholding certain data (like *Bureau Score* or *Personal Info*) affects their outcome.

- **Ensures Accountability**  
  Logs every decision in an **immutable-style audit log** for regulatory compliance and review.

---

## Key Features

### 1. Transparent Decision Engine
- Powered by an **XGBoost** model trained on realistic banking-style data.
- Handles standard credit risk features such as income, age, savings, liabilities, and credit history.

### 2. Natural Language Explanations
- SHAP values are translated into **user-friendly insights**, e.g.  
  > “Your high savings balance positively impacted this decision.”

### 3. Dynamic Consent Management
- Users can **toggle data permissions** on the fly.
- The system dynamically **masks/withholds features** (e.g., Bureau Score, Personal Info) based on consent.
- The model re-evaluates the application and updates:
  - Approval/Denial outcome
  - Confidence score
  - Explanation text

### 4. Audit Trail & Accountability
- Every decision request is **logged** with:
  - Inputs (respecting consent state)
  - Model version
  - Consent settings
  - Outcome & confidence
  - Timestamp
- Logs are stored in a lightweight **SQLite** database with a **unique hash** that can be used for retrieval and audits.

---

## Tech Stack

### Backend (API & ML)

- **Python 3.8+**
- **FastAPI** – High-performance web framework for serving the API.
- **XGBoost & Scikit-Learn** – For predictive modeling and data preprocessing.
- **SHAP** – For model explainability.
- **SQLite** – Lightweight database for audit logging.

### Frontend (UI)

- **React (Vite)** – Fast, modern frontend framework and bundler.
- **CSS** – Custom styling for a clean, professional banking interface.

---

## Project Structure

```bash
Ethical-AI-Project/
├── api/
│   └── app.py                  # FastAPI server handling predictions & auditing
├── train/
│   └── train_model.py          # Script to train the XGBoost model & SHAP explainer
├── data/
│   └── synthetic_bank_data.csv # Dataset used for training
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React application & Audit component
│   │   ├── App.css             # Styling
│   │   └── main.jsx            # Entry point
│   └── package.json
└── requirements.txt            # Python dependencies
```

---

## Quick Start Guide

Follow these steps to get the system running locally.

### Prerequisites

- **Node.js & npm** installed  
- **Python 3.8+** installed

---

### Step 1: Backend Setup

1. **Navigate to the root directory:**

   ```bash
   cd Ethical-AI-Project
   ```

2. **Create a virtual environment (recommended):**

   ```bash
   python -m venv venv

   # Windows:
   .\venv\Scripts\activate

   # Mac/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Train the AI Model**

   This generates the `model/pipeline.joblib` and `model/shap_explainer.joblib` files required by the API.

   ```bash
   python train/train_model.py
   ```

5. **Start the API Server:**

   ```bash
   python api/app.py
   ```

   The backend will run at:

   - `http://0.0.0.0:8000`

---

### Step 2: Frontend Setup

1. **Open a new terminal window** and navigate to the frontend folder:

   ```bash
   cd frontend
   ```

2. **Install Node modules:**

   ```bash
   npm install
   ```

3. **Start the React App:**

   ```bash
   npm run dev
   ```

   The frontend will typically run at:

   - `http://localhost:5173` (or similar, as shown in your terminal).

---

## How to Use

### 1. Open the App

- Go to the URL shown in the frontend terminal, e.g.:
  - `http://localhost:5173`

### 2. Run a Simulation

- Fill in the applicant details:
  - Age, Income, Savings, Liabilities, etc.
- Toggle the **Data Consent** checkboxes to see how privacy choices impact:
  - Approval status
  - Model confidence
  - Explanation text
- Click **“Run Decision”**.

### 3. Analyze Results

- View:
  - **Approval/Denial** status
  - **Confidence score**
- Read the **generated explanation** to understand *why* that decision was made.
- Note the **“Audit Hash”** generated for this transaction.

### 4. Audit the Decision

- Click the **“View Audit History”** tab.
- You can:
  - See a list of past requests.
  - Search for a specific entry using **Request ID** or **Audit Hash**.
- Verify that:
  - Inputs
  - Consent settings
  - Outputs  
  were all logged correctly.

---

## Contributing

This project contains a stable `backup` branch for the original code.

1. Fork the repository.
2. Create your feature branch:  
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:  
   ```bash
   git commit -m "Add some AmazingFeature"
   ```
4. Push to the branch:  
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a **Pull Request**.

---

## Notes

- Built for the **Ethical AI Hackathon**.
- Intended as a **PoC** and educational reference for:
  - Ethical AI design
  - Responsible ML in financial services
  - Regulatory-friendly explainable systems

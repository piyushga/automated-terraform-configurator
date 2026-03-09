# Automated Terraform Configurator

Automated Terraform Configurator is a Master's thesis project that provides a web-based interface for configuring cloud infrastructure and automatically generating Terraform configurations for deployment.

The goal of the project is to simplify infrastructure provisioning by allowing users to select resource requirements such as CPU, memory, storage, and region through a user-friendly interface, while the system handles infrastructure logic, pricing estimation, Terraform file generation, and provisioning automation in the background.

## Tech Stack

- Frontend: React + TypeScript
- Backend: FastAPI (Python)
- Infrastructure: Terraform

## How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/automated-terraform-configurator.git
cd automated-terraform-configurator
```

### 2. Setup the frontend

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Make sure your `frontend/.env` contains:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the frontend:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

### 3. Setup the backend

Open a new terminal and go to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it:

#### Windows
```bash
.venv\Scripts\activate
```

#### Linux / macOS
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Make sure your `backend/.env` contains the required cloud and Terraform variables, for example:

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_SUBSCRIPTION_ID=your-azure-subscription-id

TF_VAR_ssh_public_key=your-public-ssh-key
```

Run the backend:

```bash
uvicorn main:app --reload
```

The backend will run on:

```text
http://127.0.0.1:8000
```

### 4. Terraform

Make sure Terraform is installed on your system and available in your terminal:

```bash
terraform -version
```

Terraform is executed automatically by the backend when a user creates infrastructure from the UI.

## Features

- Cloud resource configuration through a web interface
- Region and instance type retrieval
- Pricing estimation
- Terraform configuration generation
- Automated infrastructure provisioning
- Support for AWS, Azure, and GCP

## Author

**Piyush Garg**  


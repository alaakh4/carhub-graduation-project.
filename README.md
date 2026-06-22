# CarHub Graduation Project

CarHub is a graduation project for managing car-maintenance services. It connects clients with spare-parts shops and workshops, supports parts ordering and service requests, and provides AI-assisted fault-category prediction.

## Main Features

- Client and shop registration and authentication
- Spare-parts browsing, searching, ordering, and order tracking
- Workshop profiles, service requests, ratings, and reviews
- Shop dashboards for products, orders, and help requests
- Administration and shop-account approval
- AI-assisted prediction of the required maintenance category
- Web and Android clients

## Technology Stack

- Frontend: Oracle JET, JavaScript, Knockout, HTML, and CSS
- Backend: Java 17 and Spark Framework
- Database: MySQL
- AI service: Python, Flask, pandas, joblib, and scikit-learn
- Android: Oracle JET and Cordova

## Project Structure

```text
CARHUB/
|-- frontend/       Web application
|-- backend/        Java REST API
|-- AI Model/       Training code, dataset, model, and Flask API
|-- android/        Android application source
|-- CarHubFiles/    Static and uploaded application files
|-- new grad (1).docx
|-- README.md
`-- .gitignore
```

## Local Ports

| Component | Port |
|---|---:|
| Web frontend | 8000 |
| Java backend | 4567 |
| Python AI service | 5000 |
| MySQL | 3306 |

## Prerequisites

- Java Development Kit 17
- Node.js and npm
- Python 3
- MySQL
- Oracle JET CLI

## Running the Backend

From the `backend` directory on Windows:

```powershell
.\gradlew.bat run
```

The backend runs at `http://localhost:4567`.

## Running the AI Service

```powershell
cd "AI Model"
python -m pip install flask pandas joblib scikit-learn
python model_API.py
```

The AI service runs at `http://127.0.0.1:5000`.

## Running the Frontend

```powershell
cd frontend
npm install
npx ojet serve
```

The frontend is expected at `http://localhost:8000` and calls the backend on port `4567`.

## Android Application

```powershell
cd android
npm install
npx ojet build hybrid --platform=android
```

Generated Android platforms, build files, and APK files are excluded from Git. A final APK can be attached separately to a GitHub Release.

## Main API Examples

```text
POST /api/client/login
POST /api/shop/login
GET  /api/parts
POST /api/client/parts-orders
GET  /api/shop/parts-orders
POST /api/ai/predict-service
```

## Documentation

The complete graduation project report is available here:

[CarHub Graduation Project Report](./new%20grad%20%281%29.docx)

## Academic Information

- Academic year: 2025/2026
- Institution: Culture and Science City, Higher Institute of Computer Science and Information Systems
- Team members: Add student names here
- Supervisor: Add supervisor name here

## Repository Branches

- `main`: Complete integrated graduation project and documentation
- `frontend`: Frontend development
- `backend`: Backend development
- `ai-model`: AI-model development
- `android`: Android development

## Notice

This repository was prepared as an academic graduation project. Confirm licensing and public-distribution requirements with the project supervisor or institution before making the repository public.

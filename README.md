# ReconcileAI - Autonomous Bank Reconciliation Agent

An AI-powered autonomous reconciliation agent that ingests bank statements and accounting system data, then matches, flags, and explains transactions using OpenAI.

## Features

- **AI-Powered Matching**: Uses GPT-4 to intelligently match bank transactions with accounting entries
- **Multi-Format Support**: Handles PDF, CSV, and XLSX bank statements
- **Smart Explanations**: AI provides explanations for each match with confidence scores
- **Bilingual Support**: English and Arabic interface
- **Real-time Processing**: Background AI processing with live updates
- **Export Reports**: Generate PDF and CSV reconciliation reports
- **Accounting Integration**: Connect to Xero and QuickBooks (planned)

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM
- **OpenAI GPT-4** - AI matching engine
- **JWT** - Authentication

### Frontend
- **React** - UI library
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router** - Navigation

### Infrastructure
- **Render.com** - Hosting platform
- **Render Disk** - File storage
- **PostgreSQL** - Managed database

## Quick Start

### 1. Environment Setup

Create a `.env` file with:

```env
DATABASE_URL=postgresql://user:password@localhost/reconcileai
SECRET_KEY=your-super-secret-key
OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. Backend Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

## Deployment on Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Connect your repository to Render
3. Render will automatically detect the `render.yaml` file
4. Add your environment variables in the Render dashboard

### Option 2: Manual Setup

1. **Create PostgreSQL Database**
   - Name: `reconcileai-db`
   - Plan: Starter

2. **Create Web Service**
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host=0.0.0.0 --port=$PORT`

3. **Add Disk Storage**
   - Name: `reconcileai-uploads`
   - Mount Path: `/mnt/data`
   - Size: 1GB

4. **Set Environment Variables**
   - `DATABASE_URL` (from your database)
   - `SECRET_KEY` (generate a random string)
   - `OPENAI_API_KEY` (from OpenAI)

## API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /token` - User login
- `GET /me` - Get current user

### File Management
- `POST /upload` - Upload bank statement
- `GET /statements` - Get all statements
- `GET /statements/{id}/transactions` - Get statement transactions

### Reconciliation
- `POST /reconcile/{statement_id}` - Start AI reconciliation
- `GET /reports/{statement_id}` - Get reconciliation reports

## Usage

1. **Register/Login** - Create an account
2. **Upload Statement** - Upload your bank statement (PDF, CSV, XLSX)
3. **AI Processing** - Let the AI analyze and match transactions
4. **Review Matches** - Review AI-suggested matches with explanations
5. **Export Reports** - Generate reconciliation reports

## AI Features

### Intelligent Matching
- **Fuzzy Logic**: Matches transactions even with slight variations
- **Context Awareness**: Understands transaction descriptions and patterns
- **Confidence Scoring**: Provides confidence levels for each match
- **Explanation Generation**: Explains why transactions were matched

### Supported Actions
- **Match**: Exact or approximate matches
- **Flag**: Mark as duplicate or suspicious
- **Split**: Suggest splitting large transactions
- **Defer**: Mark for manual review

## Future Features

- **Xero Integration**: Direct API connection to Xero
- **QuickBooks Integration**: Direct API connection to QuickBooks
- **Journal Entry Generation**: AI-generated journal entries
- **Cash Flow Forecasting**: Predictive analytics
- **Multi-Bank Support**: Handle multiple bank accounts
- **White-label Solutions**: Customizable for banks

## Business Model

- **SaaS Pricing**: $29-$99/month based on volume
- **Accountant Portals**: Multi-client management
- **White-label Partnerships**: Bank partnerships (e.g., KFH)
- **Pay-per-Reconciliation**: Usage-based pricing

## Glossary (Arabic)

| English Term | Arabic Translation |
|-------------|-------------------|
| Bank Reconciliation | التسوية البنكية |
| Journal Entry | قيد محاسبي |
| Depreciation | الإهلاك |
| Cash Flow Forecast | التنبؤ بالتدفق النقدي |
| Unmatched Transactions | معاملات غير مسوّاة |
| Reconcile | تسوية |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@reconcileai.com or create an issue in the repository.

---

**ReconcileAI** - Making bank reconciliation intelligent, automated, and accessible.

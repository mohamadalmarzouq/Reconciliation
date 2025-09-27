# ReconcileAI - AI-Powered Bank Reconciliation Platform

A Next.js application that automates bank reconciliation using AI. Upload bank statements, connect accounting platforms, and leverage GPT-powered logic to match, flag, and explain financial transactions.

## Features

- 📄 **Smart Upload**: Support for PDF, CSV, and XLSX bank statements
- 🧠 **AI Matching**: GPT-4 powered transaction matching with confidence scores
- 📊 **Real-time Dashboard**: Track reconciliation progress with detailed analytics
- 📈 **Export Reports**: Generate comprehensive PDF and CSV reports
- 🔗 **Accounting Integration**: Connect to Xero and QuickBooks (coming soon)

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4
- **File Processing**: pdf-parse, csv-parser, xlsx
- **Deployment**: Render.com

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/reconcile-ai.git
cd reconcile-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the following:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node.js
4. Add environment variables in Render dashboard
5. Deploy!

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── reconcile/     # Reconciliation API
│   ├── upload/            # Upload page
│   ├── review/            # Review page
│   ├── export/            # Export page
│   └── page.tsx           # Home page
├── components/            # React components
│   └── Navbar.tsx         # Navigation component
├── lib/                   # Utility functions
│   ├── fileUpload.ts      # File upload logic
│   └── reportGenerator.ts # Report generation
└── types/                 # TypeScript types
    └── index.ts           # Type definitions
```

## API Endpoints

### POST /api/reconcile

Reconcile bank transactions with accounting entries using AI.

**Request Body:**
```json
{
  "bankTransactions": [
    {
      "id": "txn-1",
      "date": "2025-09-01",
      "description": "Zain POS 345",
      "amount": -12.00,
      "type": "debit"
    }
  ],
  "accountingEntries": [
    {
      "id": "acc-1",
      "date": "2025-09-01",
      "description": "Invoice #248 - Zain Telecom",
      "amount": 12.00,
      "account": "Accounts Receivable"
    }
  ]
}
```

**Response:**
```json
{
  "matches": [
    {
      "transactionId": "txn-1",
      "confidence": 0.95,
      "explanation": "Matched with Invoice #248 due to amount and customer match",
      "suggestedAction": "match",
      "accountingEntryId": "acc-1"
    }
  ],
  "summary": {
    "totalProcessed": 1,
    "matchesFound": 1,
    "confidenceScore": 0.95
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@reconcileai.com or create an issue on GitHub.

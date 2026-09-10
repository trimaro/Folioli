# Folioli 🌿

A modern, privacy-focused Personal Finance Tracker built with web technologies for the desktop.

## Goal

Folioli is built to give users complete control over their financial data. Unlike cloud-based finance applications that store your transactions on remote servers, Folioli provides the smooth, intuitive experience of a modern web application while keeping your data 100% local and secure on your machine.

## Function

The application functions by letting users import their bank statements (via CSV) through a simple drag-and-drop interface. Once imported, Folioli automatically categorizes future transactions by learning from your manual edits. It features an interactive dashboard that visualizes income versus expenses over time, alongside a detailed, sortable, and editable transaction table. All user data, including learned category mappings, is securely persisted in a local SQLite database.

## Tech Stack
- **Framework:** [Tauri](https://tauri.app/) (v2) for the native desktop wrapper
- **Frontend:** [Next.js](https://nextjs.org/) (React 19) powering the web-based interface
- **Language:** TypeScript
- **Database:** SQLite (local DB on your device)
- **Styling:** Tailwind CSS

## Core Features
- 📊 **Transaction Tracking:** Import via drag-and-drop, manage, and edit financial transactions.
- 🏷️ **Smart Categorization:** Trains a local mapping system so future transactions are categorized automatically.
- 📈 **Visualizations:** Insightful dashboard charts to track income vs. expenses dynamically.
- 🔒 **Privacy First:** All data is stored strictly locally. No cloud uploads, ensuring peace of mind.

## Development

### Prerequisites
- Node.js (v20+)
- Rust (for Tauri backend)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```
   This will start the Next.js frontend and the Tauri desktop window.

## Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) 
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

# MSN Messenger Archive Viewer

A local web app for browsing your old MSN Messenger chat history. Built with a Windows XP MSN Messenger aesthetic. Complete with the classic UI chrome, scrollbars, emoticons, and all.

![MSN Messenger Archive Viewer](.github/preview.png)

## Features

- Browse all your old MSN Messenger conversations in a familiar UI
- Multiple chat windows open simultaneously, draggable and minimizable
- Contacts grouped and merged across accounts and duplicate log files
- Full-text search across all conversations
- In-chat find (Ctrl+F) with previous/next navigation and match highlighting
- MSN emoticon codes rendered as emoji (`:)`, `(L)`, `(})`, etc.)
- Virtual scrolling — handles conversations with thousands of messages
- Windows XP MSN Messenger theme

## Data Format

This app reads the XML log files that MSN Messenger saved locally on your computer. If you still have them, they'll be in a folder structure like:

```
My Documents\My Received Files\<your_username>\History\
```

Or on older Windows installs:

```
C:\Documents and Settings\<user>\My Documents\My Received Files\<your_username>\History\
```

Each contact has one or more `.xml` files named after their MSN username.

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/de3web/msn-messenger-archive.git
cd msn-messenger-archive
```

### 2. Add your data

Place your MSN Messenger history folders inside `data/`. The expected structure is:

```
data/
  <your_username_1>/
    History/          (or history/ — case insensitive on Windows)
      contact1.xml
      contact2.xml
      ...
  <your_username_2>/   (optional — multiple accounts supported)
    History/
      ...
```

### 3. Configure your accounts

Open `server/parser.ts` and update the `ACCOUNTS` array to match your folder names:

```ts
const ACCOUNTS = [
  { name: 'your_username_1', historyDir: 'History' },
  { name: 'your_username_2', historyDir: 'History' },
]
```

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both the backend and frontend in development mode |
| `npm run build` | Build the frontend for production |
| `npm run export` | Export all parsed conversations to `data/export/` as JSON |

## Tech Stack

- **Frontend**: React + TypeScript, Vite
- **Backend**: Express + tsx (TypeScript)
- **XML parsing**: fast-xml-parser
- **Scrollbars**: overlayscrollbars
- **Virtual scrolling**: @tanstack/react-virtual

## Notes

- Your chat data never leaves your machine, everything runs locally
- The backend runs on port `3002` by default (configurable in `server/index.ts`)
- Conversations from multiple accounts and duplicate log files for the same contact are automatically merged

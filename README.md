# WhatsApp Clone

## Features
- **Authentication**: Login/Register with JWT.
- **Real-time Messaging**: Socket.io backed instant messaging.
- **Media Sharing**: Send Images and Videos.
- **Online Status**: See who is online in real-time.
- **Dark Mode**: WhatsApp-like UI.

## Setup & Run

### Prerequisites
- Node.js
- MongoDB (Running on `mongodb://localhost:27017`)

### Installation

1.  **Install Server Dependencies**:
    ```bash
    cd server
    npm install
    ```

2.  **Install Client Dependencies**:
    ```bash
    cd client
    npm install
    ```

### Running Locally

You can use the provided script or run commands manually.

**Using PowerShell Script:**
```powershell
./run_app.ps1
```

**Manual Start:**

1.  Start Backend:
    ```bash
    cd server
    npm run dev
    ```

2.  Start Frontend:
    ```bash
    cd client
    npm run dev
    ```

## Environment Variables

**Server (`server/.env`)**:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/whatsapp-clone
JWT_SECRET=supersecretkey
CLIENT_URL=http://localhost:5173
```

## Deployment

- **Frontend**: Build using `npm run build` and deploy `dist` folder (Vercel, Netlify).
- **Backend**: Deploy to Render/Heroku/Railway. Ensure connection to MongoDB Atlas.

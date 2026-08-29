# car-rental-backend

Express + MongoDB API for the car rental app.

## ⚠️ Before you do anything: rotate your MongoDB password

If this project ever had a `.env` file committed to git and later removed,
the old credentials are still visible in that repo's history. If that's the
case for you, go to MongoDB Atlas → Database Access → edit the user → set a
new password, before deploying. A password that was ever pushed to a public
repo should be treated as compromised even after you delete the file.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and fill in real values
npm run dev
```

Server runs on http://localhost:5000 by default.

## Create an admin user (run once)

```bash
node scripts/createAdmin.js
```

## Environment variables (see .env.example)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret used to sign login tokens |
| `CLOUDINARY_CLOUD_NAME` | From cloudinary.com dashboard |
| `CLOUDINARY_API_KEY` | From cloudinary.com dashboard |
| `CLOUDINARY_API_SECRET` | From cloudinary.com dashboard |
| `STRIPE_SECRET_KEY` | From stripe.com dashboard (starts with `sk_`) |
| `CLIENT_URL` | URL of the deployed **frontend** (customer site), used for Stripe redirect links after checkout |
| `PORT` | Local dev only — Render/Railway set this automatically |

## Deploy on Render

1. New → Web Service → connect this repo.
2. Root Directory: leave blank (this repo's root **is** the backend).
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add all the environment variables above in the Environment tab.
   - You won't know the real `CLIENT_URL` until the frontend is deployed —
     deploy the frontend first, then come back and set this, then redeploy.
6. Deploy. You'll get a URL like `https://car-rental-backend.onrender.com` —
   this is the value you'll use as `VITE_API_URL` in both the frontend and
   admin repos.

## Also whitelist Render's IPs in MongoDB Atlas

Render's free/starter tier doesn't give a fixed outbound IP. In Atlas →
Network Access → Add IP Address → allow `0.0.0.0/0` (allow from anywhere),
otherwise MongoDB will reject the connection from Render.

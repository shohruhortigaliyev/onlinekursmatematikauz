Online Test Platform — Simple Backend

This repository contains a minimal Node.js + Express backend for the static online test frontend.

Quick start:

1. Install dependencies

```bash
npm install
```

2. Start server

```bash
npm start
```

3. Open the frontend in your browser (server serves static files):

http://localhost:3000/admin.html

Notes:

- Default admin key is `12345`. You can set `ADMIN_KEY` env var to change it.
- API endpoints:
  - `GET /api/tests` — list tests
  - `POST /api/tests` — create test (requires header `x-admin-key`)
  - `PUT /api/tests/:id` — update (requires admin)
  - `DELETE /api/tests/:id` — delete (requires admin)
  - `GET /api/results` — list results (requires admin)
  - `POST /api/results` — submit result (used by frontend)

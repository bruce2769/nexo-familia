# Nexo Familia 2030 🏛️

**Plataforma LegalTech de Derecho de Familia — Chile**

Sistema completo de asistencia legal para familias en procesos judiciales chilenos.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 🏗️ Arquitectura

```
nexo-platform/
├── apps/
│   ├── nexo-frontend/       # React 18 + Vite → Vercel
│   ├── nexo-backend/        # Python + FastAPI → Railway/Render
│   └── nexo-node-backend/   # Node.js + Express → Railway/Render
└── firestore.rules          # Reglas de seguridad Firestore
```

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite, Recharts, jsPDF, docx |
| Backend IA | Python, FastAPI, Ollama (llama3.1) |
| Backend Radar | Node.js, Express, node-cron |
| Base de datos | Firebase Firestore + SQLite (causas) |
| Auth | Firebase Authentication |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway / Render |

---

## ⚡ Módulos

| # | Módulo | Estado |
|---|--------|--------|
| 1 | 🧠 Diagnóstico Legal | ✅ Funciona |
| 2 | 🤖 Copiloto IA (Ollama) | ✅ Funciona |
| 3 | 💰 Impacto Financiero (IPC real) | ✅ Funciona |
| 4 | ⚖️ Mapa de Jueces (SQLite) | ✅ Funciona |
| 5 | 🧮 Calculadora UTM/UF | ✅ Funciona |
| 6 | 📄 Generador Documentos PDF/Word | ✅ Funciona |
| 7 | 📡 Radar Judicial (tiempo real) | ⚠️ Requiere Node backend |
| 8 | 🔐 Login Firebase | ✅ Funciona |
| 9 | 📋 Historial Diagnósticos | ✅ Funciona |
| 10 | 🎯 Score de Riesgo | ✅ Funciona |
| 11 | 📍 Mis Causas (Firestore) | ✅ Funciona |
| 12 | 🔍 Escáner Resoluciones (Ollama) | ✅ Funciona |
| 13 | 💬 Muro Comunitario (Firestore) | ✅ Funciona |
| 14 | 📚 Guías Legales | ✅ Funciona |
| 15 | 📖 Glosario Legal | ✅ Funciona |

---

## 🖥️ Desarrollo Local

### 1. Frontend (React + Vite)

```bash
cd apps/nexo-frontend
cp .env.example .env
# Editar .env con tus credenciales Firebase
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend Python (FastAPI)

```bash
cd apps/nexo-backend
pip install fastapi uvicorn httpx pymupdf
uvicorn main:app --reload --port 8001
# → http://localhost:8001
# Requiere: ollama serve (para IA)
```

### 3. Backend Node (Radar Judicial)

```bash
cd apps/nexo-node-backend
cp .env.example .env
# Agregar credenciales Firebase Admin
npm install
npm start
# → http://localhost:3001
```

---

## 🌐 Despliegue en Vercel (Frontend)

1. Importar este repositorio en [vercel.com](https://vercel.com/new)
2. **Root Directory**: `apps/nexo-frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Agregar variables de entorno (ver `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=nexo-familia.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexo-familia
VITE_FIREBASE_STORAGE_BUCKET=nexo-familia.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_NEXO_BACKEND_URL=https://tu-backend.railway.app
```

---

## 🔒 Seguridad

- Firebase API Key se lee desde variables de entorno (`VITE_*`), nunca hardcodeada
- `serviceAccountKey.json` excluido del repo (ver `.gitignore`)
- Reglas Firestore con validación de `userId` en cada colección
- RUTs anonimizados antes de enviarse a Ollama
- Rate limiting en endpoints de IA (20 req/min por IP)
- CORS configurado por entorno (dev vs. producción)

---

## 📝 Variables de Entorno Requeridas

Ver [`apps/nexo-frontend/.env.example`](apps/nexo-frontend/.env.example) para el frontend.

> ⚠️ **NUNCA subas `.env` a Git ni compartas `serviceAccountKey.json`**

---

## 📄 Licencia

Proyecto privado — Nexo Familia 2030 © 2026

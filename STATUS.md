# ✅ Nexo Familia — Estado Final del Código

**Actualizado:** Mayo 2025 | **Versión:** v2.1.1

---

## Qué se corrigió en esta sesión

### 🔴 Bugs de código — TODOS CORREGIDOS

| Archivo | Problema | Estado |
|---------|----------|--------|
| `ScannerModule.jsx` | 4 `console.log` de debug en producción | ✅ Eliminados |
| `ScannerModule.jsx` | URL `/causas/procesar` sin `/api/v1` | ✅ Corregida |
| `AuthModule.jsx` | URL `/users/init` sin `/api/v1` | ✅ Corregida |
| `AuthContext.jsx` | URL `/users/init` sin `/api/v1` | ✅ Corregida |
| `CopilotoModule.jsx` | URL `/copiloto` sin `/api/v1` | ✅ Corregida |
| `EscritosModule.jsx` | URL `/escritos/generar` sin `/api/v1` | ✅ Corregida |
| `HistorialModule.jsx` | URL `/escritos/history/...` sin `/api/v1` | ✅ Corregida |
| `localCopilot.js` | URL `/copiloto` sin `/api/v1` | ✅ Corregida |
| `Topbar.jsx` | URL `/payments/...` sin `/api/v1` | ✅ Corregida |

### ✅ Código verificado y correcto (sin cambios necesarios)

| Componente | Estado |
|------------|--------|
| `firebase/db.js` — `saveDiagnosisToCloud` | ✅ Correcto |
| `firebase/config.js` | ✅ Correcto |
| `AuthContext.jsx` — flujo register | ✅ Correcto |
| `AuthModule.jsx` — flujo login/register | ✅ Correcto |
| Backend `main.py` — CORS, middleware | ✅ Correcto |
| Backend `routers/users.py` — prefix `/api/v1/users` | ✅ Correcto |
| Backend `routers/health.py` — `/health` | ✅ Correcto |
| Backend `railway.json` — healthcheck, startCommand | ✅ Correcto |
| Backend `nixpacks.toml` — Python 3.11 | ✅ Correcto |
| Backend `requirements.txt` | ✅ Correcto |

---

## Lo que falta — Acciones TUYAS (no de código)

### 🔴 Crítico — Sin esto el backend no funciona

**1. Restaurar el servicio en Railway**
```
railway.app → Tu proyecto → + New Service → Deploy from GitHub
Root Directory: apps/nexo-backend
```
Variables a configurar en Railway:
```
OPENAI_API_KEY          = sk-proj-...
FIREBASE_SERVICE_ACCOUNT_JSON = {...en una línea...}
ALLOWED_ORIGINS         = https://nexo-familia.vercel.app
FRONTEND_URL            = https://nexo-familia.vercel.app
OPENAI_MODEL            = gpt-4o-mini
```

Para obtener el JSON de Firebase en una línea:
```bash
cd "apps/nexo-backend"
python format_firebase_key.py
```

**2. Inicializar Git y subir a GitHub**
```bash
cd "C:\Users\bruce\.gemini\antigravity\scratch\Nexo Familia 2030\nexo-platform"
git init
git add .
git commit -m "feat: Nexo Familia v2.1.1 — producción completa"
git remote add origin https://github.com/TU_USUARIO/nexo-familia.git
git branch -M main
git push -u origin main
```

**3. Variables en Vercel**

Vercel Dashboard → Settings → Environment Variables:
```
VITE_NEXO_BACKEND_URL     = https://TU-NUEVO-URL.up.railway.app
VITE_FIREBASE_API_KEY     = ...
VITE_FIREBASE_AUTH_DOMAIN = ...
VITE_FIREBASE_PROJECT_ID  = ...
VITE_FIREBASE_STORAGE_BUCKET = ...
VITE_FIREBASE_MESSAGING_SENDER_ID = ...
VITE_FIREBASE_APP_ID      = ...
```
→ Luego hacer **Redeploy** en Vercel.

### 🟡 Importante — Sin esto las reglas de seguridad de Firestore no están activas

**4. Desplegar Firestore Rules**
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

**5. Agregar FIREBASE_TOKEN como Secret en GitHub** (para el workflow de CI/CD de rules)
```bash
firebase login:ci
# Copiar el token → GitHub repo → Settings → Secrets → FIREBASE_TOKEN
```

---

## Smoke tests — Una vez que Railway esté activo

```bash
# Reemplaza TU-URL con tu URL real de Railway

# 1. Health check
curl https://TU-URL.up.railway.app/health
# Respuesta esperada: {"ok":true,"firebase":true,"version":"2.1.0"}

# 2. Copiloto IA
curl -X POST https://TU-URL.up.railway.app/api/v1/copiloto \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "Qué es la pensión alimenticia?"}'

# 3. Tipos de escritos
curl https://TU-URL.up.railway.app/api/v1/escritos/tipos

# 4. Swagger UI
open https://TU-URL.up.railway.app/docs
```

---

> Ver `DEPLOY.md` para la guía completa paso a paso.

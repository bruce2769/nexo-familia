# 🚀 Nexo Familia — Guía de Despliegue a Producción

**Stack:** FastAPI (Railway) + React/Vite (Vercel) + Firebase (Auth + Firestore)  
**Versión:** v2.1.0 — Actualizado: Mayo 2025

---

## Índice

1. [Pre-requisitos](#1-pre-requisitos)
2. [Backend en Railway](#2-backend-en-railway)
3. [Firebase — Firestore Rules](#3-firebase--firestore-rules)
4. [Frontend en Vercel](#4-frontend-en-vercel)
5. [GitHub — Repositorio y Secrets](#5-github--repositorio-y-secrets)
6. [Verificación final (smoke tests)](#6-verificación-final-smoke-tests)
7. [Checklist de lanzamiento](#7-checklist-de-lanzamiento)

---

## 1. Pre-requisitos

Tener instalado en tu máquina:

```bash
node -v          # >= 18
python --version # >= 3.11
git --version    # cualquiera reciente
```

Cuentas necesarias:
- [railway.app](https://railway.app) — backend Python
- [vercel.com](https://vercel.com) — frontend React
- [Firebase Console](https://console.firebase.google.com) — Auth + Firestore
- [GitHub](https://github.com) — repositorio del monorepo
- [OpenAI Platform](https://platform.openai.com) — API Key

---

## 2. Backend en Railway

### 2.1 Preparar la clave de Firebase

```bash
# Desde la carpeta del backend
cd "apps/nexo-backend"

# 1. Descarga el JSON desde:
#    Firebase Console → ⚙️ Configuración → Cuentas de servicio → Generar nueva clave privada
#    Guárdalo como: apps/nexo-backend/serviceAccountKey.json

# 2. Convertir a una sola línea (requerido por Railway)
python format_firebase_key.py

# ➜ Copia el valor que aparece entre las líneas de "====="
# ➜ El archivo firebase_key_railway.txt también lo tendrá
# ⚠️ Elimina serviceAccountKey.json y firebase_key_railway.txt cuando termines
```

### 2.2 Crear el servicio en Railway

1. Ir a [railway.app](https://railway.app) → Tu proyecto → **+ New Service**
2. Seleccionar **"Deploy from GitHub repo"**
3. Repositorio: `tu-usuario/nexo-familia`
4. En **Root Directory** poner: `apps/nexo-backend`
5. Railway detectará `nixpacks.toml` automáticamente

### 2.3 Variables de entorno en Railway

En el panel del servicio → **Variables** → agregar:

| Variable | Valor |
|----------|-------|
| `OPENAI_API_KEY` | `sk-proj-...` (tu clave de OpenAI) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | El JSON en una línea del paso 2.1 |
| `ALLOWED_ORIGINS` | `https://nexo-familia.vercel.app` |
| `FRONTEND_URL` | `https://nexo-familia.vercel.app` |
| `OPENAI_MODEL` | `gpt-4o-mini` |

> **Nota:** `DATABASE_URL` es inyectada automáticamente si agregas el addon de PostgreSQL en Railway.

### 2.4 Verificar el deploy

```bash
# Una vez que Railway termine el build y el healthcheck pase:
curl https://TU-URL.up.railway.app/health
# Respuesta esperada:
# {"ok":true,"status":"ok","version":"2.1.0","ia":"openai","firebase":true}
```

---

## 3. Firebase — Firestore Rules

### 3.1 Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 3.2 Desplegar reglas

```bash
cd "apps/nexo-backend"   # o la raíz del monorepo donde está firebase.json

# Verificar que .firebaserc apunta al proyecto correcto
cat .firebaserc

# Desplegar solo las reglas (sin tocar hosting)
firebase deploy --only firestore:rules
```

### 3.3 Verificar en Firebase Console

- Ir a **Firestore Database → Reglas**
- Confirmar que la fecha de publicación es reciente
- Las 7 colecciones deben estar cubiertas: `users`, `diagnosticos`, `radar_causas`, `escritos`, `muro`, `pagos`, `analytics`

---

## 4. Frontend en Vercel

### 4.1 Variables de entorno en Vercel

Ir a [vercel.com](https://vercel.com) → Tu proyecto → **Settings → Environment Variables**

Agregar las siguientes (aplican a `Production`, `Preview` y `Development`):

| Variable | Valor |
|----------|-------|
| `VITE_NEXO_BACKEND_URL` | `https://TU-URL.up.railway.app` (sin `/` al final) |
| `VITE_FIREBASE_API_KEY` | Tu API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | `tu-proyecto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `tu-proyecto` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `tu-proyecto.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Tu sender ID |
| `VITE_FIREBASE_APP_ID` | Tu App ID |

> Puedes encontrar estos valores en Firebase Console → ⚙️ Configuración del proyecto → Tus apps → SDK de Firebase.

### 4.2 Redesplegar el frontend

Después de agregar las variables, redeploy:
```bash
# Opción A: desde el panel de Vercel → "Redeploy"
# Opción B: hacer un git push al main (si está conectado a GitHub)
```

---

## 5. GitHub — Repositorio y Secrets

### 5.1 Inicializar Git y subir el monorepo

```bash
cd "C:\Users\bruce\.gemini\antigravity\scratch\Nexo Familia 2030\nexo-platform"

git init
git add .
git commit -m "feat: Nexo Familia v2.1 — producción completa"

# Crear un repo nuevo en https://github.com/tu-usuario/nexo-familia
git remote add origin https://github.com/TU_USUARIO/nexo-familia.git
git branch -M main
git push -u origin main
```

### 5.2 Configurar Secrets para GitHub Actions

Ir a tu repo en GitHub → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor |
|--------|-------|
| `FIREBASE_TOKEN` | Resultado de `firebase login:ci` en tu terminal |

```bash
# Obtener el token de CI de Firebase
firebase login:ci
# ➜ Copia el token que aparece y agrégalo como secret FIREBASE_TOKEN
```

---

## 6. Verificación final (smoke tests)

Una vez completado el deploy, ejecutar:

```bash
# Reemplaza TU-URL con la URL real de Railway

# ✅ Test 1: Health check del backend
curl https://TU-URL.up.railway.app/health

# ✅ Test 2: Endpoint copiloto IA
curl -X POST https://TU-URL.up.railway.app/api/v1/copiloto \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "Hola, qué es la pensión alimenticia?"}'

# ✅ Test 3: Tipos de escritos (no requiere auth)
curl https://TU-URL.up.railway.app/api/v1/escritos/tipos

# ✅ Test 4: Documentación interactiva
open https://TU-URL.up.railway.app/docs
```

---

## 7. Checklist de lanzamiento

```
[ ] 1. Backend Railway — servicio activo y /health devuelve {"ok":true,"firebase":true}
[ ] 2. Variables en Railway — OPENAI_API_KEY + FIREBASE_SERVICE_ACCOUNT_JSON + ALLOWED_ORIGINS
[ ] 3. Firestore rules — firebase deploy --only firestore:rules ejecutado
[ ] 4. Variables en Vercel — VITE_NEXO_BACKEND_URL + todas las VITE_FIREBASE_*
[ ] 5. Frontend redesplegado en Vercel con las nuevas variables
[ ] 6. git init + git push al repositorio de GitHub
[ ] 7. Secret FIREBASE_TOKEN configurado en GitHub para CI/CD
[ ] 8. Smoke tests pasando (los 4 curl del paso 6)
[ ] 9. Crear cuenta de prueba en el frontend y verificar 3 créditos
[ ] 10. Probar flujo completo: Auth → Diagnóstico → Historial → Copiloto
```

---

## Notas de arquitectura

```
nexo-platform/
├── apps/
│   ├── nexo-frontend/     → Vercel (React + Vite + PWA)
│   └── nexo-backend/      → Railway (FastAPI + Python 3.11)
├── firestore.rules        → Firebase (desplegar con firebase-tools)
├── firebase.json          → Configuración de Firebase hosting/rules
├── .firebaserc            → Proyecto de Firebase vinculado
└── .github/workflows/     → CI/CD (requiere FIREBASE_TOKEN secret)
```

**Flujo de autenticación:**
1. Usuario se registra → Firebase Auth crea el usuario
2. Frontend llama a `POST /api/v1/users/init` con el token de Firebase
3. Backend verifica el token y crea el documento en Firestore con 3 créditos
4. Frontend escucha los créditos en tiempo real via `onSnapshot`

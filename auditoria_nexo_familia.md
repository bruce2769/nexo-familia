# 🔎 Auditoría Completa — Estado Actual del Proyecto «Nexo Familia»
> Generada el 2026-04-05 | Auditada sin modificar código

---

## 1. ESTRUCTURA DEL PROYECTO (Monorepo)

```
nexo-platform/
├── apps/
│   ├── nexo-frontend/          ← App principal (Vite + React)
│   ├── nexo-backend/           ← Backend Python FastAPI (Railway)
│   ├── nexo-node-backend/      ← Backend Node.js / Playwright (Railway)
│   └── nexo-dashboard-legacy/  ← Dashboard viejo (separado, sin integrar)
├── packages/
│   ├── ai-engine/              ← Paquete compartido (estado desconocido)
│   └── scraper/                ← Paquete scraper (estado desconocido)
├── firestore.rules
└── auditoria_nexo_familia.md
```

**Observaciones:**
- No hay `package.json` raíz de monorepo (ni `pnpm-workspace.yaml` ni Turborepo config). No es un monorepo real con workspace linking; es un "multi-repo" dentro de la misma carpeta.
- `nexo-dashboard-legacy` existe como app independiente sin evidencia de integración con el frontend principal.
- `packages/ai-engine` y `packages/scraper` no se ven importados por el frontend.
- Se detectó `index_final.html` duplicado en `apps/nexo-frontend/` (archivo huérfano).

---

## 2. FRONTEND

### Arquitectura
- **Framework:** Vite 5 + React 18 + JSX  
- **Entry point:** `src/main.jsx` → `src/nexo/NexoApp.jsx`
- **Routing:** Tab-based sin React Router (estado `activeTab`). Funciona correctamente para SPA.
- **Módulos (16 total):** DiagnosticoModule (eager), + 12 lazy-loaded, + AuthModule, MapaJuecesModule y DocumentosModule presentes en disco pero **DocumentosModule** no está en el switch de rutas.

### Navegación
- **Sidebar:** Menú lateral completo con todos los tabs (desktop). ✅
- **BottomNav:** Barra inferior mobile con 5 tabs (Inicio, Diagnosticar, Escritos, Copiloto, Perfil). ✅
- **Topbar:** Presente, implementado. ✅

### Problemas detectados
| # | Archivo | Problema |
|---|---------|----------|
| 1 | `src/nexo/components/CreditBanner.jsx` | **VACÍO** (0 bytes). Importación posible causaría error en runtime. |
| 2 | `src/main.jsx` | Desregistra **todos** los Service Workers en cada boot (`registration.unregister()`) — destruye el cacheo PWA en cada carga. Anti-patrón grave. |
| 3 | `index_final.html` | Archivo HTML duplicado en raíz del frontend. No se usa, puede confundir. |
| 4 | `DocumentosModule.jsx` | Existe en disco (~17KB) pero **no está mapeado en ningún tab** ni en `NexoApp.jsx`. |
| 5 | `App.jsx` | Tiene 53KB — archivo muy grande, sugiere código legacy mezclado. |

---

## 3. COPILOTO IA — BUG CRÍTICO 🚨

### Flujo actual
```
Frontend (CopilotoModule.jsx) → POST /api/v1/copiloto
                                  body: { message: "..." }   ← campo "message"

Backend (main.py, línea 308) → CopilotoRequest(mensaje: str) ← campo "mensaje"
```

**El frontend envía `message`, el backend espera `mensaje`.**  
Esto provoca que Pydantic rechace la petición con `422 Unprocessable Entity`.  
**El Copiloto NO funciona en producción.**

### Otros problemas del Copiloto
- La UI muestra "GPT-4o Mini — Activo" siempre en el header, incluso antes de hacer una petición. El estado `iaOnline` inicia en `true` pero puede ser `false` tras un error.
- El historial de conversación no se envía al backend (el campo `historial: []` siempre vacío). El backend tiene soporte para `historial` pero el frontend no lo construye.

---

## 4. ESCRITOS LEGALES — PROBLEMA DE AUTENTICACIÓN ⚠️

### Flujo actual
```
Frontend (EscritosModule.jsx) → localStorage.getItem('nf_token')
                                 → POST /api/v1/escritos/generar
                                   Authorization: Bearer <token_localStorage>

Backend → Depends(verify_firebase_token) → verifica token Firebase real
```

**El frontend obtiene el token de `localStorage` (clave `nf_token`)**, pero en ninguna parte del código de auth se guarda un token en esa clave (el `AuthContext` usa Firebase nativo, no localStorage manual).  
Esto provoca que el endpoint de escritos reciba un `Bearer undefined` o vacío, y el backend retorna `401 Unauthorized`.

**Los escritos no se generan para usuarios autenticados.**

### Lo que sí funciona
- La UI de selección de tipo, formulario causa y datos personales funciona correctamente.
- La validación de RUT está bien implementada.
- La exportación PDF y DOCX (una vez obtenido el resultado) funciona en cliente.

---

## 5. BACKEND PYTHON (FastAPI — Railway)

### Endpoints detectados
| Endpoint | Estado |
|----------|--------|
| `GET /health` | ✅ Funcional |
| `GET /api/health` | ✅ Funcional |
| `POST /api/v1/copiloto` | ❌ Bug: recibe `message` espera `mensaje` |
| `POST /api/v1/escritos/generar` | ❌ Bug: token siempre vacío desde frontend |
| `POST /api/v1/scanner/analizar` | ⚠️ Funciona, pero requiere Firebase Admin activo |
| `POST /api/v1/scanner/subir` | ⚠️ Ídem |
| `GET /api/v1/analytics/*` | ✅ Funciona si SQLite está disponible |
| `POST /api/v1/causas/procesar` | ⚠️ Requiere Firebase + OpenAI |
| `GET /api/v1/causas/mis-causas` | ⚠️ Requiere Firebase |
| `POST /api/v1/sentencias/subir` | ⚠️ Requiere Firebase + OpenAI |

### Variables de entorno en railway (según .env.example)
| Variable | Estado |
|----------|--------|
| `OPENAI_API_KEY` | No visible localmente (debe estar en Railway) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Vacío en `.env` local; debe estar en Railway |
| `STRIPE_SECRET_KEY` | No configurada → fallback a `sk_test_dummy` |
| `MERCADOPAGO_ACCESS_TOKEN` | No configurada → fallback a `TEST-dummy` |
| `ALLOWED_ORIGINS` | Solo `localhost` en local |

### Problemas de diseño
- `main.py` tiene **1.286 líneas** — monolítico, difícil de mantener.
- CORS configurado con `allow_origins=["*"]` + `allow_credentials=False`. Funciona pero es permisivo.
- La DB SQLite (`causas_judiciales.db` 17MB) se lee en Railway. Si Railway reinicia el contenedor, los datos de SQLite se pierden (Railway no tiene filesystem persistente por defecto).

---

## 6. BACKEND NODE.JS (Express — Railway)

- Tiene Playwright instalado → scraper del Poder Judicial.
- `serviceAccountKey.json` está en el directorio raíz del proyecto (posible riesgo de seguridad si no está en `.gitignore`).
- Su funcionalidad no es directamente visible desde la UI actual (no hay tab de Radar Judicial en NexoApp, fue eliminado según comentario en el código).
- La variable `VITE_NEXO_NODE_URL` apunta a Railway pero el frontend no la usa en ningún módulo activo visible.

---

## 7. VARIABLES DE ENTORNO

### Frontend (`nexo-frontend/.env`)
| Variable | Estado |
|----------|--------|
| `VITE_FIREBASE_*` | ✅ Todas configuradas con valores reales |
| `VITE_NEXO_BACKEND_URL` | ✅ Apunta a Railway Python |
| `VITE_API_URL` | ⚠️ Duplicada con `VITE_NEXO_BACKEND_URL` (misma URL) |
| `VITE_NEXO_NODE_URL` | ⚠️ Configurada pero no usada activamente |

**Advertencia:** El archivo `.env` con claves reales de Firebase está en el repositorio. Debe estar en `.gitignore`.

### Compatibilidad con Vercel
- El frontend usa `import.meta.env.VITE_*` correctamente. ✅
- Las variables deben configurarse en el panel de Vercel (Environment Variables).
- No hay `api/` serverless functions en el frontend — todo el backend está en Railway.

---

## 8. PWA

| Item | Estado |
|------|--------|
| `vite-plugin-pwa` configurado | ✅ |
| `manifest.json` generado por Vite | ✅ (en memoria, no archivo separado) |
| Icons completos en `public/` | ✅ (64x64, 192x192, 512x512, maskable) |
| `apple-touch-icon` | ✅ |
| `theme-color` y `background_color` | ✅ |
| Service Worker | ❌ `main.jsx` lo desregistra en cada boot |
| Instalación en móvil | ⚠️ Posible pero SW se elimina al cargar |

**El Service Worker se desregistra en cada carga** (`navigator.serviceWorker.getRegistrations().then(r => r.unregister())`). Esto impide el uso offline y la instalación estable como PWA.

---

## 9. BUILD

> No se ejecutó `npm run build` en esta auditoría (instrucción: no modificar). Sin embargo, se pueden anticipar los siguientes riesgos:

| Riesgo | Severidad |
|--------|-----------|
| `CreditBanner.jsx` vacío (0 bytes) podría causar error de importación si es importado en algún módulo | Alta |
| `electron` en devDependencies podría generar warnings en build web | Media |
| `App.jsx` de 53KB con código potencialmente legacy | Media |
| Dependencias Electron (`electron-builder`, `concurrently`) en un proyecto web-only | Baja |

---

## 10. LIMPIEZA

| Elemento | Acción sugerida |
|----------|-----------------|
| `index_final.html` | Eliminar (duplicado) |
| `DocumentosModule.jsx` | Integrar o eliminar |
| `nexo-dashboard-legacy/` | Evaluar si tiene valor; si no, eliminar |
| `packages/ai-engine/` y `packages/scraper/` | Evaluar uso real |
| `App.jsx` (53KB) | Revisar si tiene código activo o es legacy |
| `VITE_API_URL` | Consolidar con `VITE_NEXO_BACKEND_URL` |
| `serviceAccountKey.json` en node-backend | Mover a variable de entorno |
| `.env` con datos reales | Asegurar en `.gitignore` |

---

## DIAGNÓSTICO FINAL

### ✅ Qué funciona correctamente
- Estructura del frontend (Vite + React + módulos lazy)
- Firebase Auth (login, registro, anónimo)
- Sidebar + BottomNav (navegación desktop y mobile)
- Módulos: Diagnóstico, Calculadora, Riesgo, Glosario, Guías, Historial, Muro (Comunidad)
- Backend health endpoints `/health` y `/api/health`
- Analytics SQLite (velocidad tribunales, materias, KPIs)
- PWA manifest e icons correctamente configurados
- Configuración Vercel (`vercel.json` con SPA rewrite)
- Variables de entorno Firebase cargadas correctamente

### ⚠️ Qué funciona parcialmente
- **Scanner:** Funciona si Firebase Admin está activo en Railway y OPENAI_API_KEY configurada
- **Módulo Causa:** Depende de Firebase Admin en backend
- **PWA offline:** No opera como PWA real (SW se destruye en cada carga)
- **Módulo Estado (Mis Causas):** Funciona si Firebase está operativo
- **Copiloto — UI:** Carga bien visualmente, pero las respuestas fallan

### ❌ Qué está roto
1. **Copiloto IA:** Campo `message` (frontend) vs `mensaje` (backend) → `422 Unprocessable Entity` en cada consulta
2. **Escritos Legales:** Token de autorización vacío (usa `localStorage.getItem('nf_token')` que nunca se escribe) → `401 Unauthorized`
3. **Service Worker PWA:** Se desregistra en cada boot → sin cacheo ni modo offline
4. `CreditBanner.jsx` está vacío (0 bytes) → posible crash si se importa

### 🧹 Qué se debe eliminar / limpiar
- `index_final.html` (duplicado)
- `App.jsx` legacy (53KB, evaluar contenido)
- `nexo-dashboard-legacy/` app sin uso activo
- Variable duplicada `VITE_API_URL`
- Script de desregistro de SW en `main.jsx`
- Dependencias Electron en frontend web: `electron`, `electron-builder`, `wait-on`
- `serviceAccountKey.json` fuera de variables de entorno

### 🚀 Qué falta para producción

| Tarea | Prioridad |
|-------|-----------|
| **Fix campo `message` → `mensaje`** en Copiloto (frontend o backend) | 🔴 Crítica |
| **Fix token de auth** en EscritosModule (usar `getIdToken()` de Firebase) | 🔴 Crítica |
| **Eliminar desregistro de SW** en `main.jsx` | 🔴 Crítica |
| Confirmar `OPENAI_API_KEY` configurada en Railway | 🔴 Crítica |
| Confirmar `FIREBASE_SERVICE_ACCOUNT_JSON` en Railway | 🔴 Crítica |
| Migrar SQLite a Firestore o PostgreSQL (Railway no tiene filesystem persistente) | 🟠 Alta |
| Completar `CreditBanner.jsx` o eliminar referencias | 🟠 Alta |
| Integrar o eliminar `DocumentosModule.jsx` | 🟡 Media |
| Limpiar dependencias Electron del package.json frontend | 🟡 Media |
| Configurar `.gitignore` para excluir `.env` con datos reales | 🟡 Media |
| Tests automáticos (ninguno detectado) | 🟡 Media |
| Separar `main.py` en routers modulares | 🟢 Baja |

---

*Auditoría realizada por inspección estática de código. No se ejecutaron comandos de build ni se verificó el estado en tiempo real de Railway.*

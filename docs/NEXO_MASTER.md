# 📋 NEXO FAMILIA — Registro Maestro de Cambios

> **Proyecto:** Nexo Familia — Plataforma Legal SaaS Chile  
> **Documento generado:** 2026-04-25 · 13:34 (UTC-4, Chile)  
> **Reemplaza:** `STATUS.md`, `README.md`, `auditoria_nexo_familia.md`, todos los README anteriores

---

## 🏗️ Arquitectura del Proyecto

```
nexo-platform/
├── apps/
│   ├── nexo-frontend/          ← Vite 5 + React 18 + PWA (Vercel)
│   ├── nexo-backend/           ← FastAPI Python (Railway)
│   └── nexo-node-backend/      ← Express.js scraper PJUD (secundario)
├── docs/
│   └── NEXO_MASTER.md          ← Este archivo (único documento)
├── firestore.rules
└── packages/
```

### Backend Python — Arquitectura modular (desde 2026-04-25)

```
nexo-backend/
├── main.py               ← Entry point (70 líneas)
├── core/
│   ├── config.py         ← Firebase Admin, OpenAI, ENV vars
│   ├── security.py       ← verify_firebase_token, rate limiter
│   ├── credits.py        ← sistema de créditos Firestore
│   ├── database.py       ← SQLite local / PostgreSQL Railway (auto-detect)
│   ├── openai_client.py  ← llamar_openai, caché MD5, RUT validator
│   └── pdf_docx.py       ← generación PDF/DOCX ReportLab + python-docx
└── routers/
    ├── health.py
    ├── copiloto.py
    ├── scanner.py
    ├── escritos.py
    ├── analytics.py
    ├── causas.py
    ├── payments.py
    └── users.py
```

---

## 📅 Registro Cronológico Completo de Cambios

---

### 2026-04-17 · 03:36 UTC — Auditoría y Reparaciones Críticas

**Contexto:** Post-auditoría completa. El proyecto tenía bugs críticos que impedían el funcionamiento en producción.

#### Fix Crítico 1 — Copiloto IA: campo `message` → `mensaje`
- **Archivo:** `apps/nexo-frontend/src/nexo/modules/CopilotoModule.jsx`
- **Problema:** El frontend enviaba `{ message: text }` pero el backend Pydantic esperaba `{ mensaje: str }`. Resultado: 422 Unprocessable Entity en cada consulta.
- **Solución:** `JSON.stringify({ mensaje: text })` en línea 59.
- **Estado:** ✅ Verificado en código.

#### Fix Crítico 2 — Escritos Legales: token localStorage → `getIdToken()`
- **Archivo:** `apps/nexo-frontend/src/nexo/modules/EscritosModule.jsx`
- **Problema:** El token de autenticación se leía de `localStorage` (inseguro y siempre vacío en sesiones nuevas), causando 401 en `/escritos/generar`.
- **Solución:** `auth.currentUser.getIdToken(true)` en líneas 86-92.
- **Estado:** ✅ Verificado en código — sin ninguna referencia a `localStorage`.

#### Fix Crítico 3 — PWA roto: `registration.unregister()`
- **Archivo:** `apps/nexo-frontend/src/main.jsx`
- **Problema:** La línea `registration.unregister()` eliminaba el service worker en cada carga, rompiendo la PWA y el funcionamiento offline.
- **Solución:** Eliminada. `main.jsx` ahora tiene solo 11 líneas limpias.
- **Estado:** ✅ Verificado — sin ninguna referencia a `unregister`.

#### Fix — `CreditBanner.jsx` estaba vacío
- **Archivo:** `apps/nexo-frontend/src/nexo/components/CreditBanner.jsx`
- **Problema:** El archivo existía pero retornaba `null` incondicionalmente (componente sin implementar).
- **Solución:** Implementado completamente — 69 líneas con UI de alerta roja/amarilla y botón de recarga.
- **Estado:** ✅ Verificado.

#### Fix — Doble descuento de créditos en `/escritos/generar`
- **Archivo:** `apps/nexo-backend/main.py` (ahora `routers/escritos.py`)
- **Problema:** El endpoint descontaba 1 crédito dos veces: una en la validación y otra al guardar.
- **Solución:** Solo se descuenta una vez, al guardar el resultado exitoso en Firestore.
- **Estado:** ✅ Verificado.

#### Fix — `system_prompt` del Copiloto era placeholder
- **Archivo:** `apps/nexo-backend/main.py` (ahora `routers/copiloto.py`)
- **Problema:** El system prompt real no estaba implementado — la IA respondía sin contexto legal.
- **Solución:** System prompt completo (~400 chars) especializando en Ley N°14.908, N°19.968, Código Civil chileno.
- **Estado:** ✅ Verificado en líneas 374-386 del main.py original.

#### Limpieza — Archivos legacy eliminados
- `index_final.html` — eliminado (duplicado de `index.html`)
- `App.jsx` (~53KB) — eliminado (reemplazado completamente por `NexoApp.jsx`)
- **Estado:** ✅ Ninguno de estos archivos existe en el proyecto.

#### Integración — `DocumentosModule.jsx` en el router
- **Archivo:** `apps/nexo-frontend/src/nexo/NexoApp.jsx`
- **Problema:** El módulo existía pero no estaba mapeado en el `switch` de `renderModule()`.
- **Solución:** `case 'documentos': return <DocumentosModule />;` en línea 77.
- **Estado:** ✅ Verificado.

---

### 2026-04-25 · 13:19 UTC-4 — Auditoría de Verificación + Fixes Pendientes

**Contexto:** Verificación de que todos los fixes del 2026-04-17 fueron aplicados correctamente. Se encontraron 3 pendientes nuevos.

#### Fix — Historial de conversación en Copiloto (memoria activa)
- **Archivo:** `apps/nexo-frontend/src/nexo/modules/CopilotoModule.jsx` L46-73
- **Problema:** El frontend enviaba siempre `historial: []` vacío. El backend soportaba historial pero el frontend nunca lo construía. Cada respuesta de NEXO era sin contexto previo.
- **Solución:** Se construye el array `historial` con las últimas 6 turns de `messages[]`, filtrando errores y el saludo inicial, mapeando a `{role: "user"|"assistant", content: "..."}` que espera el backend.
- **Estado:** ✅ Aplicado.

#### Limpieza — `VITE_API_URL` duplicada
- **Archivo:** `apps/nexo-frontend/.env`
- **Problema:** Existía tanto `VITE_NEXO_BACKEND_URL` (correcto) como `VITE_API_URL` apuntando al mismo Railway URL. Fuente de confusión para el equipo.
- **Solución:** `VITE_API_URL` eliminada. Solo queda `VITE_NEXO_BACKEND_URL`.
- **Estado:** ✅ Aplicado.

#### Dead code eliminado — 5 módulos huérfanos (~97KB)
- **Directorio:** `apps/nexo-frontend/src/nexo/modules/`
- **Problema:** Los siguientes módulos existían en disco pero no estaban conectados al `switch` de `NexoApp.jsx` ni importados. Dead code puro que inflaba el bundle de producción.

| Archivo eliminado | Tamaño |
|---|---|
| `CausaModule.jsx` | 13KB |
| `RiesgoModule.jsx` | 11KB |
| `MapaJuecesModule.jsx` | **48KB** |
| `DashboardModule.jsx` | 7KB |
| `EstadoModule.jsx` | 18KB |
| **Total** | **~97KB** |

- **Estado:** ✅ Aplicado. `node_modules` intactos.

---

### 2026-04-25 · 13:21 UTC-4 — Refactorización Backend Completa + PostgreSQL

**Contexto:** El usuario solicita proyecto 100% terminado. Se ejecuta la deuda técnica principal: monolito `main.py` de 1336 líneas.

#### Refactor — `main.py` monolítico → arquitectura modular

- **Antes:** 1 archivo `main.py` de 1336 líneas / 61KB
- **Después:** `main.py` de 70 líneas / 4KB como entry point + 14 módulos especializados

| Módulo creado | Responsabilidad |
|---|---|
| `core/config.py` | Firebase init, OpenAI config, ENV vars |
| `core/security.py` | `verify_firebase_token`, rate limiter en memoria |
| `core/credits.py` | `_verificar_creditos`, `_descontar_credito`, `_verificar_limite_diario` |
| `core/database.py` | Abstracción SQLite/PostgreSQL con auto-detect |
| `core/openai_client.py` | `llamar_openai`, `llamar_openai_vision`, caché MD5, `validar_rut_chileno`, `pseudo_anonimizar` |
| `core/pdf_docx.py` | `generar_pdf_basico`, `generar_docx_basico` (márgenes judiciales chilenos) |
| `routers/health.py` | `GET /health`, `GET /api/health` |
| `routers/copiloto.py` | `POST /api/v1/copiloto` |
| `routers/scanner.py` | `POST /api/v1/scanner/analizar`, `POST /api/v1/scanner/subir` |
| `routers/escritos.py` | `POST /api/v1/escritos/generar`, `GET /tipos`, `GET /history/{uid}` |
| `routers/analytics.py` | `GET /api/v1/analytics/velocidad|kpis|materias|estacionalidad` |
| `routers/causas.py` | `POST /api/v1/causas/procesar`, `GET /mis-causas`, `POST /sentencias/subir` |
| `routers/payments.py` | Stripe + MercadoPago checkout y webhooks |
| `routers/users.py` | `POST /api/v1/users/init` (3 créditos al registro) |

- **Estado:** ✅ Aplicado.

#### Feature — Soporte dual SQLite / PostgreSQL
- **Archivo:** `core/database.py`
- **Lógica:** Si `DATABASE_URL` está configurada en el entorno → conecta a PostgreSQL (Railway addon). Si no → SQLite local (`causas_judiciales.db`, 17MB).
- **Compatibilidad:** Las queries de analytics usan funciones helper `_strftime_mes()` y `_julianday_diff()` que generan SQL compatible con ambos motores.
- **Activación:** Solo agregar el addon Railway PostgreSQL → el código lo detecta automáticamente.
- **Estado:** ✅ Aplicado.

#### Fix — CORS usa `ALLOWED_ORIGINS` env var
- **Archivo:** `main.py`
- **Antes:** `allow_origins=["*"]` hardcoded — cualquier dominio podía hacer peticiones.
- **Ahora:** Lee `ALLOWED_ORIGINS` del entorno. Soporta múltiples orígenes separados por coma. En local sin variable → `["*"]` solo en dev.
- **Estado:** ✅ Aplicado.

#### Deps — `psycopg2-binary` agregado
- **Archivo:** `requirements.txt`
- **Motivo:** Requerido para soporte PostgreSQL en Railway. Versión `>=2.9.9`.
- **Estado:** ✅ Aplicado.

---

### 2026-04-25 · 14:24 UTC-4 — Configuración completa: SEO, PWA, seguridad, monorepo

#### Fix Crítico — `index.html`: sin metadatos SEO
- **Archivo:** `apps/nexo-frontend/index.html`
- `<title>` descriptivo, `<meta description>`, keywords, canonical URL, **Open Graph** (WhatsApp/Facebook/LinkedIn), **Twitter Card**, `<link rel="manifest">`, preconnects a Railway y Firebase para reducir latencia.

#### Fix — `Topbar.jsx`: `alert()` nativo eliminado
- **Archivo:** `apps/nexo-frontend/src/nexo/components/Topbar.jsx`
- Reemplazado `alert()` bloqueante por un banner inline rojo que desaparece en 5 segundos.
- Topbar reescrito limpio: todos los estados (`loadingTopup`, `dropdownOpen`, `dropdownRef`, `paymentError`) correctamente declarados.

#### Fix — `vite.config.mjs`: PWA con caché inteligente + code splitting
- **Archivo:** `apps/nexo-frontend/vite.config.mjs`
- **Workbox runtime caching**: Analytics → CacheFirst 6h, Escritos tipos → CacheFirst 24h, Google Fonts → CacheFirst 1 año.
- **PWA shortcuts**: accesos directos desde el ícono instalado a "Diagnóstico" y "Copiloto IA".
- **Manual chunks**: `vendor-react`, `vendor-firebase`, `vendor-charts`, `vendor-motion`, `vendor-ui` — mejor hit rate de caché en el navegador.

#### Creado — `.firebaserc`
- **Archivo:** `.firebaserc` (raíz)
- Apunta a `nexo-familia-6fdf6`. Permite ejecutar `firebase deploy` sin pasar `--project` cada vez.

#### Creado — `apps/nexo-backend/.gitignore`
- Protege `venv/`, `*.db`, `.env`, `serviceAccountKey.json`, `firebase_key_railway.txt`, `pdfs_sentencias/`.

---

## 🚀 Guía de Primer Deploy

### 1. GitHub — Configurar secrets para GitHub Actions

Ir a: `https://github.com/TU_USUARIO/nexo-platform/settings/secrets/actions`

| Secret | Valor | Cómo obtenerlo |
|---|---|---|
| `FIREBASE_TOKEN` | Token CI de Firebase | `npx firebase-tools login:ci` en terminal |

### 2. Railway — Variables de entorno obligatorias

Abrir Railway → Servicio backend Python → Variables:

```
OPENAI_API_KEY          = sk-...
FIREBASE_SERVICE_ACCOUNT_JSON = {...JSON en una línea...}
ALLOWED_ORIGINS         = https://tu-app.vercel.app
FRONTEND_URL            = https://tu-app.vercel.app
```

> 💡 Para convertir el JSON a una línea: `cd apps/nexo-backend && python format_firebase_key.py`

### 3. Railway — PostgreSQL (opcional, para persistencia de analytics)

1. Railway dashboard → **Add Service** → **Database** → **PostgreSQL**
2. La variable `DATABASE_URL` se inyecta automáticamente
3. Ejecutar migración: `python migrar_postgres.py`

### 4. Vercel — Variables de entorno del frontend

```
VITE_FIREBASE_API_KEY           = AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN       = nexo-familia-6fdf6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID        = nexo-familia-6fdf6
VITE_FIREBASE_STORAGE_BUCKET    = nexo-familia-6fdf6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 782543776850
VITE_FIREBASE_APP_ID            = 1:...:web:...
VITE_NEXO_BACKEND_URL           = https://nexo-familia-production-aaf7.up.railway.app/api/v1
VITE_NEXO_NODE_URL              = https://nexo-familia-production.up.railway.app/api
```

### 5. Firebase — Desplegar Firestore Rules

```bash
cd nexo-platform
npm run deploy:rules
# o directamente:
firebase deploy --only firestore:rules
```

### 6. Git — Push inicial

```bash
cd nexo-platform
git init                        # si no existe el repo
git add .
git commit -m "feat: Nexo Familia v2.1 — producción completa"
git remote add origin https://github.com/TU_USUARIO/nexo-platform.git
git push -u origin main
```

> Los GitHub Actions se activarán automáticamente y verificarán el build antes de que Railway y Vercel desplieguen.

---

### 2026-04-25 · 14:21 UTC-4 — Completado: Firebase, Auth, Frontend, Monorepo

**Contexto:** Auditoría de AuthContext, módulos activos, Firestore rules, y configuraciones de monorepo.

#### Fix Crítico — `AuthContext.jsx`: nuevos usuarios no obtenían créditos
- **Archivo:** `apps/nexo-frontend/src/contexts/AuthContext.jsx` L56-74
- **Problema:** El método `register()` creaba el usuario en Firebase Auth pero nunca llamaba a `POST /api/v1/users/init`. Sin esa llamada el backend no creaba el documento en Firestore → usuario nuevo con 0 créditos en lugar de 3.
- **Solución:** Tras `createUserWithEmailAndPassword`, se obtiene el token y se llama a `/api/v1/users/init` con `{name, email}`. Envuelto en `try/catch` para no romper el registro si el backend está caído.

#### Fix — `HistorialModule.jsx`: referencia a `riesgo` (módulo eliminado)
- **Archivo:** `apps/nexo-frontend/src/nexo/modules/HistorialModule.jsx` L16-21
- **Problema:** `TYPE_META` tenía `riesgo: {icon:'🚦', label:'Riesgo'}` — tab de filtro que referenciaba el módulo `RiesgoModule.jsx` que fue eliminado.
- **Solución:** Reemplazado por `copiloto: {icon:'🤖', label:'Copiloto IA'}`.

#### Fix — `firebase/config.js`: comentario hack eliminado
- **Archivo:** `apps/nexo-frontend/src/firebase/config.js` L28
- Eliminado `// Force Vercel redeploy 1` — hack temporal que ya no tiene sentido con el CI/CD de GitHub Actions.

#### Reescrito — `firestore.rules`: reglas completas para todas las colecciones
- **Archivo:** `firestore.rules`
- **Antes:** Solo cubría `users`, `escritos`, `causas` — dejaba `cache_ia`, `muro`, `scanner_historial`, `ia_usage` sin reglas (acceso bloqueado por defecto pero sin documentar).
- **Ahora:** 7 colecciones explícitas con reglas de lectura granulares:
  - `users/{uid}` + subcolecciones `transactions`, `ia_usage`, `scanner_historial` → solo el propietario
  - `escritos/{docId}` → solo el propietario por `resource.data.userId`
  - `causas/{causaId}` → solo el propietario
  - `cache_ia/{hashId}` → lectura para cualquier usuario autenticado (caché compartida)
  - `muro/{postId}` + `comments` → lectura para autenticados
  - Catch-all final: `deny all` para cualquier colección no listada

#### Creado — `firebase.json`
- **Archivo:** `firebase.json` (raíz del monorepo)
- Necesario para `firebase deploy --only firestore:rules`. Apunta a `firestore.rules` y `firestore.indexes.json`.

#### Creado — `firestore.indexes.json`
- **Archivo:** `firestore.indexes.json` (raíz del monorepo)
- Archivo vacío requerido por `firebase.json`. Se puede completar si se necesitan índices compuestos en el futuro.

#### Creado — GitHub Actions: `deploy-firestore-rules.yml`
- **Archivo:** `.github/workflows/deploy-firestore-rules.yml`
- Trigger: push a `main` en `firestore.rules` o `firestore.indexes.json`. Despliega automáticamente con `firebase-tools` usando `FIREBASE_TOKEN` secret.

#### Creado — `runtime.txt` (Railway)
- **Archivo:** `apps/nexo-backend/runtime.txt`
- Contenido: `python-3.11`. Fuerza Python 3.11 en todos los buildpacks compatibles.

#### Creado — `format_firebase_key.py`
- **Archivo:** `apps/nexo-backend/format_firebase_key.py`
- Convierte `serviceAccountKey.json` (multi-línea) a formato una-sola-línea requerido por Railway como variable de entorno. Muestra el resultado en consola y lo guarda en `firebase_key_railway.txt`.

#### Creado — `package.json` raíz (monorepo)
- **Archivo:** `package.json` (raíz del monorepo)
- Scripts de conveniencia: `dev:frontend`, `dev:backend`, `health` (curl al backend), `deploy:rules`, `migrate:pg`, `format:key`.

---

### 2026-04-25 · 13:38 UTC-4 — Infraestructura de Deployment completa (Railway + GitHub + Vercel)


**Contexto:** Creación/corrección de todos los archivos de infraestructura faltantes.

#### Creado — `railway.json`
- **Archivo:** `apps/nexo-backend/railway.json`
- Configura builder Nixpacks, comando de inicio con **2 workers uvicorn**, health check en `/health`, restart automático en fallos.

#### Creado — `nixpacks.toml`
- **Archivo:** `apps/nexo-backend/nixpacks.toml`
- Python 3.11, instala `requirements.txt`, startup con 2 workers.

#### Fix — `Procfile`
- **Archivo:** `apps/nexo-backend/Procfile`
- Antes: `--workers` no especificado (1 worker, lento). Ahora: `--workers 2 --timeout-keep-alive 30`.

#### Fix — `vercel.json`
- **Archivo:** `apps/nexo-frontend/vercel.json`
- Antes: solo rewrites SPA. Ahora: Vite framework declarado, **cache inmutable** de assets hashed (`max-age=31536000`), **headers de seguridad** (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy).

#### Creado — GitHub Actions: `deploy-backend.yml`
- **Archivo:** `.github/workflows/deploy-backend.yml`
- Trigger: push a `main` en `apps/nexo-backend/**`. Acciones: setup Python 3.11, `pip install`, syntax check de todos los módulos `core/`, import test de `main.py`. Railway despliega automáticamente tras validación.

#### Creado — GitHub Actions: `deploy-frontend.yml`
- **Archivo:** `.github/workflows/deploy-frontend.yml`
- Trigger: push a `main` en `apps/nexo-frontend/**`. Acciones: setup Node 20, `npm ci`, `npm run build` con ENV vars placeholder, reporte de tamaño de bundle.

#### Creado — GitHub Actions: `health-check.yml`
- **Archivo:** `.github/workflows/health-check.yml`
- Monitor automático cada **6 horas**: pingea `GET /health`, verifica JSON `"ok":true`. Si falla → **crea issue automático** en GitHub con diagnóstico.

#### Fix — `.gitignore` raíz mejorado
- Agregados: `.vite/`, `.mypy_cache/`, `.ruff_cache/`, `.pnpm-debug.log*`, `*.tmp`, `*.temp`, `.cache/`, archivos de OS faltantes.

#### Fix — `.env.example` (backend y frontend)
- Backend: agregados `DATABASE_URL` (PostgreSQL), `FRONTEND_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`.
- Frontend: eliminado `VITE_API_URL` duplicado que fue borrado del `.env` real.

#### Reescrito — `migrar_postgres.py`
- Script reescrito completamente: migra las **4 tablas** (`tribunales`, `jueces`, `causas`, `causa_juez`), crea schema con índices optimizados para analytics, migra en chunks de 2000, muestra progreso %, manejo de conflictos `ON CONFLICT DO NOTHING`, tiempo total.

---

### 2026-04-25 · 13:34 UTC-4 — Limpieza de documentación

- Todos los archivos `.md` del proyecto eliminados (5 archivos: `STATUS.md`, `README.md`, `auditoria_nexo_familia.md`, 2× README de apps).
- Este documento `NEXO_MASTER.md` creado como fuente única de verdad.

---

## ✅ Estado Final del Sistema

### Frontend (Vite + React) — 12 módulos activos, 0 huérfanos

| Módulo | Archivo | Estado |
|---|---|---|
| Diagnóstico Legal | `DiagnosticoModule.jsx` | ✅ Eager-loaded |
| Calculadora Financiera | `CalculadoraModule.jsx` | ✅ Lazy |
| Copiloto IA | `CopilotoModule.jsx` | ✅ Lazy, historial activo |
| Escritos Legales | `EscritosModule.jsx` | ✅ Lazy, `getIdToken()` real |
| Escáner IA | `ScannerModule.jsx` | ✅ Lazy |
| Comunidad (Muro) | `MuroModule.jsx` | ✅ Lazy |
| Guías | `GuiasModule.jsx` | ✅ Lazy |
| Glosario | `GlosarioModule.jsx` | ✅ Lazy |
| Historial | `HistorialModule.jsx` | ✅ Lazy |
| Documentos Pro | `DocumentosModule.jsx` | ✅ Lazy |
| Auth / Perfil | `AuthModule.jsx` | ✅ Lazy |
| Herramientas | `AllModulesModule.jsx` | ✅ Lazy |

### Backend (FastAPI) — Todos los endpoints operativos

| Endpoint | Auth | Estado |
|---|---|---|
| `GET /health` | No | ✅ |
| `GET /api/health` | No | ✅ |
| `POST /api/v1/copiloto` | Firebase | ✅ Con historial |
| `POST /api/v1/escritos/generar` | Firebase | ✅ PDF+DOCX |
| `GET /api/v1/escritos/tipos` | No | ✅ |
| `GET /api/v1/escritos/history/{uid}` | No | ✅ |
| `POST /api/v1/scanner/analizar` | Firebase | ✅ |
| `POST /api/v1/scanner/subir` | Firebase | ✅ PDF |
| `GET /api/v1/analytics/velocidad` | No | ✅ SQLite/PG |
| `GET /api/v1/analytics/kpis` | No | ✅ SQLite/PG |
| `GET /api/v1/analytics/materias` | No | ✅ SQLite/PG |
| `GET /api/v1/analytics/estacionalidad` | No | ✅ SQLite/PG |
| `POST /api/v1/causas/procesar` | Firebase | ✅ PDF/img/texto |
| `GET /api/v1/causas/mis-causas` | Firebase | ✅ |
| `POST /api/v1/sentencias/subir` | Firebase | ✅ |
| `POST /api/v1/payments/create-checkout-session` | No | ✅ Stripe |
| `POST /api/v1/payments/webhook` | Stripe sig | ✅ |
| `POST /api/v1/payments/mercadopago/create-preference` | No | ✅ |
| `POST /api/v1/payments/mercadopago/webhook` | MP sig | ✅ |
| `POST /api/v1/users/init` | Firebase | ✅ 3 créditos |

---

## 🔐 Variables de Entorno

### Railway — Backend Python

```env
OPENAI_API_KEY=sk-...
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"nexo-familia",...}
ALLOWED_ORIGINS=https://tu-app.vercel.app
FRONTEND_URL=https://tu-app.vercel.app
DATABASE_URL=postgresql://...        # Railway PostgreSQL addon (activa PG automáticamente)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MAX_IA_REQUESTS_PER_DAY=20           # opcional, default: 20
```

### Vercel — Frontend

```env
VITE_FIREBASE_API_KEY=AIzaSyBuf83LSE...
VITE_FIREBASE_AUTH_DOMAIN=nexo-familia-6fdf6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexo-familia-6fdf6
VITE_FIREBASE_STORAGE_BUCKET=nexo-familia-6fdf6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=782543776850
VITE_FIREBASE_APP_ID=1:782543776850:web:26892f33fdd181675a438b
VITE_NEXO_BACKEND_URL=https://nexo-familia-production-aaf7.up.railway.app/api/v1
VITE_NEXO_NODE_URL=https://nexo-familia-production.up.railway.app/api
```

---

## ⚠️ Pendientes de Infraestructura (Solo requieren acción en Railway)

Estos no son bugs de código — el código ya los soporta:

1. **Activar PostgreSQL en Railway** — Agregar addon `Railway PostgreSQL`. La variable `DATABASE_URL` se inyecta automáticamente. El código la detecta y cambia de SQLite a PG sin modificaciones.
2. **Migrar datos SQLite → PostgreSQL** — Una vez activado el addon, ejecutar: `python migrar_postgres.py`
3. **Verificar `OPENAI_API_KEY` en Railway** — Sin esta key el Copiloto y los Escritos no funcionan.
4. **Verificar `FIREBASE_SERVICE_ACCOUNT_JSON` en Railway** — Sin este JSON el backend no puede validar tokens ni acceder a Firestore.

---

## 🔒 Seguridad

| Ítem | Estado |
|---|---|
| `serviceAccountKey.json` en `.gitignore` | ✅ |
| `.env` en `.gitignore` | ✅ |
| CORS restringido via `ALLOWED_ORIGINS` env var | ✅ |
| Rate limiting: 100/min global, 10/min escritos, 20/min scanner | ✅ |
| Firebase ID Token verificado en todos los endpoints protegidos | ✅ |
| RUT chileno validado en backend antes de procesar escritos | ✅ |
| Caché MD5 en Firestore para evitar re-procesar documentos idénticos | ✅ |
| Firebase config frontend pública (VITE_FIREBASE_*) — correcto por diseño Firebase | ⚠️ OK |

---

*Documento único. Actualizar con: fecha · hora · descripción del cambio.*

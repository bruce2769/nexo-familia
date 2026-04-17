# 📊 NEXO FAMILIA — Estado del Proyecto

> **Última actualización:** 2026-04-17 · Revisión post-auditoría completa

---

## ✅ Estado Actual

| Servicio | Estado | Notas |
|---|---|---|
| **Frontend (Vite + React)** | ✅ Operativo | Vite 5, React 18, PWA configurado |
| **Backend Python (FastAPI)** | ✅ Operativo | Railway, gpt-4o-mini |
| **Backend Node.js (Express)** | ⚠️ Secundario | Scraper PJUD, no usado activamente en UI |
| **Firebase Auth** | ✅ Funcional | Login, anónimo, token real |
| **Firestore** | ✅ Funcional | Caché IA, historial, créditos |
| **OpenAI (gpt-4o-mini)** | ⚠️ Depende Railway | Requiere `OPENAI_API_KEY` en Railway |
| **PWA Service Worker** | ✅ Corregido | Eliminado `unregister()` anti-patrón |
| **SQLite Analytics** | ⚠️ Efímero en Railway | 17MB, no persiste tras reinicio |

---

## 📦 Módulos

| Módulo | Estado | Notas |
|---|---|---|
| Diagnóstico Legal | ✅ OK | Módulo principal, eager-loaded |
| Calculadora Financiera | ✅ OK | IPC, pensiones |
| Copiloto IA | ✅ Corregido | `mensaje` unificado, system_prompt completo |
| Escritos Legales | ✅ Corregido | Auth vía `getIdToken()`, crédito único |
| Escáner IA | ✅ OK | Requiere Firebase Admin en backend |
| Comunidad (Muro) | ✅ OK | Firestore |
| Guías | ✅ OK | Estático |
| Glosario | ✅ OK | Estático |
| Historial | ✅ OK | Firestore |
| Documentos Pro | ✅ Integrado | En NexoApp.jsx switch |
| Auth / Perfil | ✅ OK | Firebase Auth |
| Herramientas | ✅ OK | AllModules hub |

---

## 🌐 Endpoints Backend Python

| Endpoint | Estado | Notas |
|---|---|---|
| `GET /health` | ✅ OK | Health check básico |
| `GET /api/health` | ✅ OK | Alias de /health |
| `POST /api/v1/copiloto` | ✅ Corregido | `mensaje` correcto, system_prompt real |
| `POST /api/v1/escritos/generar` | ✅ Corregido | Token Firebase real, crédito único |
| `POST /api/v1/scanner/analizar` | ✅ OK | Requiere Firebase Admin |
| `POST /api/v1/scanner/subir` | ✅ OK | PDF upload, Requiere Firebase Admin |
| `GET /api/v1/analytics/velocidad` | ✅ OK | SQLite |
| `GET /api/v1/analytics/kpis` | ✅ OK | SQLite |
| `GET /api/v1/analytics/materias` | ✅ OK | SQLite |
| `POST /api/v1/causas/procesar` | ⚠️ Con Firebase | Requiere Firebase Admin |
| `GET /api/v1/causas/mis-causas` | ⚠️ Con Firebase | Requiere Firebase Admin |
| `POST /api/v1/sentencias/subir` | ⚠️ Con Firebase | Requiere Firebase Admin |

---

## 🔧 Cambios Realizados

| Fecha | Cambio |
|---|---|
| 2026-04-17 | Fix crítico: `message` → `mensaje` unificado en Copiloto |
| 2026-04-17 | Fix crítico: `EscritosModule` usa `firebase.auth.getIdToken()` en lugar de `localStorage` |
| 2026-04-17 | Fix crítico: Eliminado `registration.unregister()` en `main.jsx` (PWA roto) |
| 2026-04-17 | Fix: `CreditBanner.jsx` completado (estaba vacío) |
| 2026-04-17 | Fix: Doble descuento de créditos en `/escritos/generar` eliminado |
| 2026-04-17 | Fix: Copiloto `system_prompt` real y completo implementado |
| 2026-04-17 | Limpieza: `index_final.html` eliminado |
| 2026-04-17 | Limpieza: `App.jsx` legacy (53KB) eliminado |
| 2026-04-17 | `DocumentosModule.jsx` mapeado en `NexoApp.jsx` switch |
| 2026-04-17 | `docs/STATUS.md` creado (este archivo) |

---

## ❗ Pendientes / Limitaciones Conocidas

- [ ] **SQLite en Railway** — Los datos analíticos (`causas_judiciales.db`, 17MB) se pierden al reiniciar el contenedor. Solución: migrar a PostgreSQL en Railway (script `migrar_postgres.py` ya existe) o mover analytics a Firestore.
- [ ] **VITE_API_URL duplicada** — En el `.env` existe tanto `VITE_NEXO_BACKEND_URL` como `VITE_API_URL` con el mismo valor. Consolidar eliminando `VITE_API_URL`.
- [ ] **Historial del Copiloto** — El frontend envía `historial: []` siempre vacío. El backend tiene soporte para historial de conversación pero el frontend no lo construye.
- [ ] **Tests automáticos** — No hay test suite. Considerar agregar en el futuro.

---

## 🔐 Variables de Entorno Requeridas

### Railway — Backend Python

```env
OPENAI_API_KEY=sk-...
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"nexo-familia",...}
ALLOWED_ORIGINS=https://tu-app.vercel.app
```

### Vercel — Frontend

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=nexo-familia-6fdf6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nexo-familia-6fdf6
VITE_FIREBASE_STORAGE_BUCKET=nexo-familia-6fdf6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_NEXO_BACKEND_URL=https://nexo-familia-production-aaf7.up.railway.app/api/v1
```

> ⚠️ **CRÍTICO:** `OPENAI_API_KEY` y `FIREBASE_SERVICE_ACCOUNT_JSON` deben estar configurados en el panel de Railway para que el Copiloto y los Escritos funcionen.

---

## 🔒 Seguridad

- ✅ `serviceAccountKey.json` está en `.gitignore` (raíz y en `nexo-node-backend/`)
- ✅ `.env` está en `.gitignore` del frontend y raíz
- ✅ Firebase credentials en variables de entorno del servidor
- ⚠️ Firebase config del frontend (VITE_FIREBASE_*) es pública por diseño de Firebase — es correcto

---

## 🚀 Próximos Pasos Priorizados

1. **Verificar en Railway** que `OPENAI_API_KEY` y `FIREBASE_SERVICE_ACCOUNT_JSON` estén configurados
2. **Probar en producción** los endpoints de Copiloto y Escritos
3. **Migrar SQLite a PostgreSQL** (Railway PostgreSQL service) usando `migrar_postgres.py`
4. **Separar `main.py`** en routers FastAPI modulares (1329 líneas)

---

*Este archivo debe actualizarse después de cada cambio significativo al proyecto.*
*Formato: `update(status): descripción del cambio`*

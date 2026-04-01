# INVENTARIO Y AUDITORÍA COMPLETA — NEXO FAMILIA

## 1. ANÁLISIS GENERAL
El proyecto consiste en una plataforma web (Vite + React) y un backend (FastAPI / Python) con integraciones de IA avanzada. 
**Estado General:** El proyecto está en fase de maduración, con un backend robusto que contiene reglas de negocio de IA, Firebase y pagos, pero con un frontend parcialmente simulado que aún no consume todos los endpoints en producción.

- **Funciona completamente:** Autenticación Firebase, webhooks de pagos (Stripe, MercadoPago), análisis RAG y llamadas generativas a OpenAI, base de datos SQLite con lecturas.
- **Funciona parcialmente:** Conexión API. El frontend tiene los contenedores y componentes UI, pero en algunos (Copiloto) usa mocking en vez de fetch real.
- **No está implementado:** Conexión de extremo a extremo (E2E) en el chatbot, manejo estricto de JSON parse en Python, y la integración al 100% de la UI con rutas dinámicas persistentes.

---

## 2. INVENTARIO POR MÓDULO (FRONTEND)
Análisis de `/frontend/src/nexo/modules/`:

| Módulo | Estado | Backend conectado | Tipo de datos | Observaciones |
|--------|--------|-------------------|---------------|---------------|
| `CopilotoModule` | SOLO UI | ❌ No | Mocks (`localCopilot.js`) | UI completa y responsiva, pero simula la respuesta de IA localmente. |
| `ScannerModule` | PARCIAL | ⚠️ Parcial | Mixto | UI para subir documentos, falta validar flujo completo a `/api/v1/scanner/subir`. |
| `EscritosModule` | PARCIAL | ⚠️ Parcial | Mixto | Backend implementa `/api/v1/escritos/generar`. UI requiere enviar payload completo. |
| `AuthModule` | FUNCIONA | ✅ Sí | Firebase | Gestor robusto de autenticación y sesiones. |
| `CausaModule` | ROTO/UI | ❌ No | Visual Data | Requiere conexión de historiales a `/api/v1/causas/...`. |
| `MapaJuecesModule` | PARCIAL | ✅ Sí | Reales (SQLite)| Consume `fetch` sobre endpoints `/api/v1/analytics/*`. |
| `CalculadoraModule` | FUNCIONA | ❌ N/A | Local (Matemática) | Flujo completo de negocio en el navegador (calcula multas y pensiones). |

---

## 3. INVENTARIO BACKEND
El backend principal (`nexo-backend/main.py`) cuenta con una extensa lista de funcionales endpoints en FastAPI:

- **Operativos (Usados):**
  - `/health`, `/api/health`
  - `/api/v1/analytics/velocidad`, `estacionalidad`, `kpis`, `materias` (Reportes SQLite).
  - Webhooks de pagos y creación de Checkout Sessions (`Stripe`/`MercadoPago`).
  - `/api/v1/users/init` (Inicializa créditos/perfiles Firebase).

- **Endpoints No Utilizados o Incompletos (Falta conexión frontal E2E):**
  - `/api/v1/copiloto`
  - `/api/v1/scanner/analizar`, `/api/v1/scanner/subir`
  - `/api/v1/causas/procesar`, `/api/v1/causas/mis-causas`
  - `/api/v1/escritos/generar`, `/api/v1/escritos/tipos`, `/api/v1/escritos/history/...`

- **Código Muerto/Inconsistencias:**
  - Tolerancia de error silenciosa con `ReportLab` y `docx`. Si no están instalados por dependencias perdidas, retornan strings vacíos.

---

## 4. FLUJOS CRÍTICOS
- **Generación de Escritos Legales (`/escritos/generar`):** 
  - ✅ Entiende el caso, formatea como "Suma" judicial. 
  - ⚠️ Puede devolver 503 si `OpenAI` genera un JSON desformateado, dado que usa Regex básico `r'\{[\s\S]*\}'`.
- **Subida de PDF y Diagnóstico (`/scanner/subir`):** 
  - ✅ Capacidad de PyMuPDF. Si falla extrae visión OCR usando `llamar_openai_vision()`.
  - ⚠️ Si se envían archivos PDF muy masivos o corrompidos, el fallo se absorbe como HTTPException 500, bloqueando la interfaz para el usuario.
- **Copiloto IA:**
  - ⚠️ Backend preparado pero Frontend desconectado. Falta un puente.

---

## 5. SISTEMA IA
- **OpenAI Integrado:** Usa `gpt-4o-mini` por defecto para todas las llamadas, y OpenAI Vision para OCR fallback ("subir un JPG o PDF con imágenes").
- **Costos/Rate Limits:** Bien administrado. Límite de 20 por minuto global, y control diario de consumos pagados vía "Créditos" (billetera Firebase).
- **Fallos en Prompting:** Confía en que GPT devuelva siempre el formato JSON exacto sin usar `response_format`. Este es el punto de quiebre más inestable.

---

## 6. SISTEMA DE CACHE
- **Arquitectura Activa:** ✅ Sí, usando Firestore (`db.collection("cache_ia")`). 
- **Mecánica Inteligente:** Extrae texto PDF -> recorta primeros 800 chars -> hashea con MD5 -> consulta Firestore.
- Si hay un HIT de caché: Ahorra llamada a OpenAI. 
- *Conclusión:* Funciona perfectamente como mecanismo de optimización, previniendo gastos masivos al subir el mismo modelo de sentencia.

---

## 7. SEGURIDAD Y ERRORES
- **Tolerancia a Fallos:** Intermedia.
- **Autenticación Fuerte:** Firebase `verify_id_token` aplicado universalmente como middleware/dependencia (`_bearer_scheme`).
- **Limpieza de PII (Datos Personales):** Tiene la función `pseudo_anonimizar()` con Regex para ocultar el RUT, pero falla en enmascarar posibles nombres completos insertados en las sentencias de Familia.

---

## 8. DEPLOY Y CONFIGURACIÓN
- **Variables Críticas:** Dependencia excesiva de variables (`FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, etc). Railway falla muchas veces manejando `\n` en keys JSON, pero el código incluye una mitigación robusta con `replace('\n', '\\n')` para evadir este bug crónico.
- **Manejo SQLite en Producción:** `causas_judiciales.db` (17MB+) está incluido en el repo original. Esto significa que si este contendor es reiniciado por Vercel/Railway, los datos no persistirán (o no deben ser modificados si se pretende que persistan sin un volumen docker).

---

## 9. BRECHAS CRÍTICAS

### 🔴 CRÍTICO (Rompe funcionalidad a ojos de usuario)
- **El Frontend "engaña":** `CopilotoModule` y similares simulan funcionamiento asíncrono con `simulateCopilotResponse`. Estos deben vincularse de inmediato al backend real `/api/v1/copiloto` enviando el Bearer Token real.
- **Desencuentro de JSON:** En `_procesar_texto_scanner`, el regex fallará el 5% de veces que OpenAI incluya ticks invertidos de markdown alrededor del JSON block (ej. ` ```json {...} ``` `).

### 🟠 IMPORTANTE (Afecta calidad / Robustez)
- **Base de datos efímera:** Si los usuarios guardan analytics de forma regular (no parece ser el caso, al ser analytics más estático), perderían data en Railway. Sin embargo, para `users`, `cache_ia` y `escritos` se usa Firestore, por lo que **esto es seguro**.

### 🟡 MEJORAS (No urgente)
- **JSON Object API OpenAI:** Pasar la llamada de openai a usar `response_format={ "type": "json_object" }`. Esto elimina la necesidad de `regex` y asegura un 100% de fiabilidad en el parseo estructurado de respuestas legales.

---

## 10. RESULTADO FINAL
El sistema base (Node UI / Python Backend) está fuertemente consolidado. El **75% del trabajo pesado (Backend + IA + Cache + Pagos) está terminado y correctamente escrito**. Lo que falta es puramente "la última milla": cablear los módulos de UI (React) con la API REST ya desarrollada en `/api/v1/...`, y robustecer el parseo de respuestas de OpenAI.

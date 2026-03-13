# Nexo Backend — Pilar 1: Conexión al Poder Judicial

## 📁 Estructura del Proyecto

```
nexo-backend/
├── src/
│   ├── server.js              # Punto de entrada, Express + arranque
│   ├── scheduler.js           # Cron job — orquesta el scraping completo
│   ├── firebase/
│   │   └── admin.js           # Firebase Admin SDK (Singleton)
│   ├── scraper/
│   │   ├── pjudApiClient.js   # Cliente REST del PJUD (método rápido)
│   │   ├── pjudPlaywright.js  # Cliente Playwright (navegador real, fallback)
│   │   ├── resolucionDetector.js  # Motor de detección + escritura a Firestore
│   │   ├── testRun.js         # Prueba el scraper sin Firebase
│   │   └── testApi.js         # Verifica conectividad a endpoints del PJUD
│   ├── routes/
│   │   └── radar.js           # API REST: subscribe, status, trigger
│   └── utils/
│       └── logger.js          # Logger con Winston
├── logs/                      # Generado automáticamente
├── .env.example               # Template de variables de entorno
└── package.json
```

## 🚀 Pasos para Iniciar

### 1. Instalar dependencias
```bash
cd nexo-backend
npm install
npx playwright install chromium
```

### 2. Configurar Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com) → tu proyecto
2. **Configuración del proyecto** → **Cuentas de servicio** → **Generar nueva clave privada**
3. Guarda el JSON descargado como `nexo-backend/serviceAccountKey.json`

### 3. Crear `.env`
```bash
cp .env.example .env
```
Edita `.env` con tu URL de Firebase Realtime Database (o déjala vacía si solo usas Firestore).

### 4. Probar conectividad al PJUD
```bash
npm run test:api
```
Esto verifica si los endpoints del PJUD responden. Si devuelven **403**, cambia a modo Playwright:
```
SCRAPER_MODE=playwright
```

### 5. Probar el scraper con un RIT real
Edita `src/scraper/testRun.js` y configura `TEST_CONFIG` con tu RIT real:
```js
const TEST_CONFIG = {
  rit:         'C-1234-2023',  // ← Tu RIT real
  codigoCorte: '15',
  tribunal:    'JFAM001',
};
```
Luego ejecuta:
```bash
npm run test:scraper
```

### 6. Arrancar el servidor
```bash
npm run dev   # Desarrollo (con auto-reload)
npm start     # Producción
```

---

## 📐 Arquitectura: Flujo Completo

```
USUARIO carga RadarModule.jsx
    │
    ▼
Ingresa RIT + Tribunal
    │
    ▼
RadarModule → POST /api/radar/subscribe (con Firebase JWT)
    │
    ▼
Backend guarda suscripción en:
  Firestore: /radarSuscripciones/{userId}/causas/{rit}
    │
    ▼
scheduler.js (corriendo en background, cron cada 6h)
    │
    ├─► Lee /radarSuscripciones para todos los usuarios
    │
    ├─► Para cada causa:
    │     ├─ Intenta pjudApiClient (REST rápido)
    │     └─ Si falla → pjudPlaywright (navegador real)
    │
    ├─► resolucionDetector.detectarEventosCriticos()
    │     └─ Filtra movimientos con palabras clave
    │
    └─► Guarda en Firestore:
          /radarEventos/{userId}/movimientos/
          /radarEventos/{userId}/alertas/  ← Las nuevas resoluciones
                │
                ▼
    RadarModule.jsx (onSnapshot listener)  ← Recibe en tiempo real
```

---

## 🔑 Variables de Entorno

| Variable | Descripción | Default |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Ruta al JSON de credenciales | `./serviceAccountKey.json` |
| `CRON_SCHEDULE` | Frecuencia del scraper | `0 */6 * * *` (c/6h) |
| `SCRAPER_MODE` | `api` o `playwright` | `api` |
| `MIN_DELAY_MS` | Delay mínimo entre requests | `3000` |
| `MAX_DELAY_MS` | Delay máximo entre requests | `8000` |

---

## ⚠️ Consideraciones del PJUD

### Bloqueos comunes y soluciones

| Problema | Solución |
|---|---|
| HTTP 403 (Cloudflare) | Cambiar a `SCRAPER_MODE=playwright` |
| Rate limiting (429) | Aumentar `MIN_DELAY_MS` a 8000 |
| Timeout | El PJUD es lento. Normal. Aumentar timeout en `pjudApiClient.js` |
| Estructura HTML cambió | Actualizar selectores en `pjudPlaywright.js` |
| Formato de respuesta JSON cambió | Actualizar `normalizarMovimientos()` en `pjudApiClient.js` |

### Límites recomendados
- **No más de 50 causas** por usuario en producción inicial
- **Cron cada 6 horas** mínimo (no hacer scraping agresivo)
- **Rotar User-Agents** si hay bloqueos masivos

---

## 🔌 API REST

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/radar/subscribe` | Suscribir una causa al radar |
| `DELETE` | `/api/radar/unsubscribe/:rit` | Quitar causa del radar |
| `GET` | `/api/radar/status/:rit` | Ver estado y movimientos de una causa |
| `POST` | `/api/radar/trigger-scan` | Forzar ciclo de scraping (solo dev) |
| `GET` | `/api/radar/scheduler-status` | Estado del scheduler |
| `GET` | `/health` | Health check del servidor |

**Todos requieren header:** `Authorization: Bearer <Firebase ID Token>`

---

## 🗺️ Códigos del PJUD

### Cortes de Apelaciones
| Código | Corte |
|---|---|
| `15` | Santiago |
| `09` | Valparaíso |
| `01` | Arica |
| `02` | Iquique |
| `03` | Antofagasta |
| `18` | Rancagua |
| `20` | Talca |

### Tipos de RIT
| Tipo | Descripción |
|---|---|
| `C` | Civil |
| `F` | Familia |
| `RIT` | RIT genérico |
| `ALI` | Alimentos |

---

## 🔮 Próximos Pasos (Pilar 2)

Una vez que el scraper funciona, el siguiente paso es añadir el **Copiloto IA**:

```js
// En resolucionDetector.js — añadir tras detectar evento crítico:
if (evento.nivel === 'CRITICO') {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const traduccion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `Eres un abogado chileno de familia. Explica en lenguaje de 5to básico esta resolución: "${evento.descripcion}"`
    }]
  });
  // Guardar traduccion.choices[0].message.content en Firestore
}
```

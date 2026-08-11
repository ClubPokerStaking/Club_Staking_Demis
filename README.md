# Venta de Acción

Plataforma multi-organizador para vender % de acción de torneos de poker,
con verificación automática de pagos en USDT (TRC20 / Ethereum / Polygon).

Reescrita desde cero como app cliente-servidor: todo lo sensible (permisos,
claves de API, verificación de pagos, datos de compradores) vive en el
backend, no en el navegador.

## Estructura

- `backend/` — API en Node.js + Express + Prisma (SQLite). Autenticación,
  reglas de negocio, verificación on-chain y datos.
- `frontend/` — React + Vite. Solo interfaz, todo dato sensible pasa por la API.

## Cómo correr en desarrollo

```bash
# 1. Backend
cd backend
npm install
copy .env.example .env      # y completá JWT_SECRET con un valor propio largo
npx prisma migrate dev --name init
npm run dev                 # http://localhost:4000

# 2. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

El frontend proxea `/api/*` hacia `http://localhost:4000` (ver
`frontend/vite.config.js`), así que en desarrollo no hay problemas de cookies
cross-origin.

## Primer uso

1. Entrá a `http://localhost:5173/register` y creá tu cuenta de organizador
   (elegís un identificador único, ej. `mi-club` → tu link será `/o/mi-club`).
2. En el panel, cargá tu clave de Etherscan (si vas a aceptar ETH/Polygon) y,
   opcionalmente, una clave de acceso para compradores.
3. Publicá un torneo con la wallet donde vas a recibir los pagos.
4. Compartí `http://tu-dominio/o/mi-club` con tus compradores.

Cualquier otra persona puede registrarse con su propio identificador y tener
su propio sitio, completamente aislado del tuyo (esto es lo que permite
"replicar" la app para otros organizadores sin tocar código).

## Qué cambió respecto a la versión original

La versión que me pasaste guardaba todo (torneos, compras, claves de API,
contraseña de admin) en un storage de clave-valor accesible desde el propio
navegador, y las validaciones de "quién puede hacer qué" vivían solo en el
código de React. Eso significa que cualquiera con la consola del navegador
podía leer las claves, marcarse un pago como confirmado, o robarse el panel
de admin. El rediseño soluciona cada punto:

| Problema original | Solución |
|---|---|
| Cualquiera podía escribir directo al storage y marcar pagos como confirmados | Todas las escrituras pasan por la API, que valida permisos server-side |
| El primero en entrar al panel se quedaba con el admin | Cuenta con contraseña propia (bcrypt) por organizador, con slug único |
| Claves de Etherscan/Sheets viajaban al navegador de cualquier visitante | Nunca salen del backend; el admin solo ve "configurada: sí/no" |
| El gate de clave de comprador no impedía descargar los datos | La API bloquea `/tournaments` con 403 hasta que se valida la clave server-side |
| "Mi compra" traía la lista completa de compradores al navegador | El endpoint devuelve una sola compra, y solo si coincide el código exacto |
| Dos compras simultáneas podían sobrevender el mismo % | La compra corre en una transacción que fuerza el lock de escritura y recalcula el % disponible contra la base, no contra el estado del navegador |
| Montos "únicos" con tolerancia de punto flotante podían pisarse entre compras | Los montos se guardan como enteros exactos (micro-USDT) con restricción de unicidad en la base |
| Sin límite de intentos en el login de admin | Rate limiting en login, registro, verificación y envío de mensajes |
| Código de compra generado con `Math.random()` | Generado con bytes criptográficamente aleatorios |
| URL de la planilla podía apuntar a cualquier host (riesgo SSRF) | Solo se acepta `sheets.googleapis.com` |

## Antes de usarlo con plata real

- Cambiá `COOKIE_SECURE` a `"true"` en el `.env` del backend y serví todo
  por HTTPS (las cookies de sesión no deben viajar sin cifrar).
- Generá un `JWT_SECRET` largo y único para producción (no reuses el de
  desarrollo).
- El poller de verificación de pagos (`backend/src/services/poller.js`)
  corre dentro del mismo proceso — para producción con más de una instancia
  del servidor, hay que moverlo a un proceso/worker aparte para no duplicar
  las consultas a la blockchain.
- Hay dos vulnerabilidades moderadas heredadas de dependencias (`esbuild` en
  el servidor de desarrollo de Vite, y una de `react-router-dom` que recién
  se resuelve del todo en su versión 7). Ninguna de las dos es explotable
  con el uso normal de esta app, pero si querés cerrarlas del todo más
  adelante, migrar a Vite 8 / React Router 7 las resuelve.

## Servidores corriendo ahora mismo

Mientras dure esta sesión de trabajo, dejé corriendo:
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

Para volver a levantarlos manualmente en el futuro, seguí los pasos de
"Cómo correr en desarrollo" de arriba.

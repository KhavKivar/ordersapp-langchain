# ordersapp-langchain

Bot de WhatsApp para gestión de pedidos de licores (Vasvani Shop), construido con LangGraph y baileys.

## Arquitectura

Router principal que clasifica cada mensaje y lo deriva a un subgrafo especializado:

```
WhatsApp (baileys)
    └── graph/index.ts  (router + MemorySaver)
            ├── product_catalog  → consulta productos y precios
            ├── orders           → crea y gestiona pedidos
            ├── customers        → registra clientes
            └── fallback         → mensaje de bienvenida
```

El router usa `withStructuredOutput` para clasificar el mensaje en base al historial completo. Cada subgrafo es un `StateGraph` compilado sin checkpointer — la persistencia la maneja únicamente el grafo raíz.

## Requisitos

- Node.js 20+
- pnpm
- Cuenta de DeepSeek con API key
- Backend REST corriendo (ver `config/env.ts` para las variables requeridas)

## Variables de entorno

Crear un archivo `.env` en la raíz:

```env
DEEPSEEK_API_KEY=...
API_BASE_URL=http://localhost:3000   # URL del backend
BOT_NUMBER=56912345678               # Número del bot para pairing code (opcional, usa QR si no se define)
```

## Instalación

```bash
pnpm install
```

## Uso

```bash
pnpm start
```

Al iniciar, si `BOT_NUMBER` está definido en `.env`, el bot solicita un código de vinculación por número de teléfono. Abrí WhatsApp > Dispositivos vinculados > Vincular con número de teléfono e ingresá el código.

Si no definís `BOT_NUMBER`, aparece un QR en la terminal.

Las credenciales se guardan en la carpeta `auth/` (no se commitea).

## Scripts de prueba

```bash
pnpm test:product-catalog   # prueba consulta de productos
pnpm test:orders            # prueba flujo de pedido completo
pnpm test:customers         # prueba registro de cliente
```

## Estructura

```
graph/
  index.ts                  # router principal + grafo raíz
  product-catalog/          # subgrafo de catálogo
  orders/                   # subgrafo de pedidos
    tools/
      order-store.ts        # carrito en memoria por thread_id
      search-products.tool.ts
      add-to-order.tool.ts
      remove-from-order.tool.ts
      view-order.tool.ts
      confirm-order.tool.ts
      get-client.tool.ts
  customers/                # subgrafo de clientes
config/
  env.ts                    # variables de entorno validadas
  models.ts                 # constantes de modelos DeepSeek
axios/
  instance.ts               # cliente HTTP hacia el backend
client.ts                   # conexión WhatsApp (baileys)
index.ts                    # entrypoint
```

## Logging

Cada mensaje procesado genera un archivo `trace.log` con el historial completo de mensajes, útil para debuggear el comportamiento del router y los agentes.

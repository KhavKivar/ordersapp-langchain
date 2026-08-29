# WhatsApp Order Agent

A conversational order-management agent built with LangGraph and Baileys. It classifies incoming WhatsApp messages, routes them to specialized subgraphs, and coordinates product, customer, and order operations against an external REST API.

## Architecture

```text
WhatsApp (Baileys)
    -> root graph (router + MemorySaver)
        -> product catalog
        -> orders and cart tools
        -> customer registration
        -> fallback response
```

The root graph uses structured output to classify each message from its conversation history. Specialized `StateGraph` instances handle domain workflows while the root checkpointer owns session memory.

## Setup

Requirements: Node.js 20+, pnpm, a DeepSeek API key, and a compatible order-management API.

```bash
pnpm install
cp .env.example .env
pnpm start
```

When `BOT_NUMBER` is configured, Baileys uses phone-number pairing. Otherwise it displays a QR code. Local WhatsApp credentials are stored under `auth/` and are ignored by Git.

## Workflow checks

```bash
pnpm test:product-catalog
pnpm test:orders
pnpm test:customers
```

These scripts exercise live integrations and require the corresponding API and model credentials.

## Structure

```text
graph/       Root router and specialized domain subgraphs
config/      Environment and model configuration
axios/       REST API client
providers/   WhatsApp and model providers
client.ts    Baileys connection
index.ts     Application entry point
```

Runtime traces may contain conversation content and are excluded from version control.

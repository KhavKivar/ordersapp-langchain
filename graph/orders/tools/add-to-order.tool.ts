import { tool } from "@langchain/core/tools";
import z from "zod";
import Fuse from "fuse.js";
import get_list_of_products from "../../product-catalog/api/get-list-of-products";
import { getCart } from "./order-store";

export const addToOrderTool = tool(
  async (input, config) => {
    const threadId = config?.configurable?.thread_id ?? "default";
    const { products } = await get_list_of_products();
    const cart = getCart(threadId);

    const fuse = new Fuse(products, {
      keys: ["name"],
      threshold: 0.4,
    });

    const added: string[] = [];
    const errors: string[] = [];

    for (const item of input.items) {
      const results = fuse.search(item.name);

      if (results.length === 0) {
        errors.push(`❌ "${item.name}": No encontrado en el catálogo.`);
        continue;
      }

      // Si hay una coincidencia muy buena (clara), la tomamos.
      // Si hay varias parecidas, pedimos clarificación.
      if (results.length > 1 && results[0].score! > 0.1) {
        const options = results.slice(0, 3).map(r => r.item.name).join(", ");
        errors.push(`⚠️ "${item.name}" es ambiguo. Encontré varias opciones: ${options}. Por favor, sé más específico.`);
        continue;
      }

      const product = results[0].item;
      const existing = cart.find((c) => c.productId === product.id);

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.sellPriceClient,
        });
      }
      added.push(`${product.name} x${item.quantity}`);
    }

    const lines: string[] = [];
    if (added.length) lines.push(`✅ Agregado al pedido: ${added.join(", ")}.`);
    if (errors.length) lines.push(...errors);

    return lines.join("\n");
  },
  {
    name: "add_to_order",
    description:
      "Agrega uno o más productos al pedido por nombre. La herramienta busca automáticamente el producto más parecido en el catálogo.",
    schema: z.object({
      items: z
        .array(
          z.object({
            name: z.string().describe("Nombre o descripción del producto"),
            quantity: z.number().min(1).describe("Cantidad a agregar"),
          }),
        )
        .min(1),
    }),
  },
);

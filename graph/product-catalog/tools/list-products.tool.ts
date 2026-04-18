import { tool } from "@langchain/core/tools";
import get_list_of_products from "../api/get-list-of-products";
import { Product } from "../api/product.schema";
import { toCapitalized } from "../../../utils/format";
import { KNOWN_BRANDS } from "../constants";

export const listProductsTool = tool(
  async () => {
    const products = await get_list_of_products();
    const listOfProducts = products.products;

    let responseMessage = "";
    // Asegurarse de que el type exista y limpiar duplicados ignorando mayúsculas
    const types = [
      ...new Set(
        listOfProducts.map(
          (item: Product) => item.type?.toUpperCase() || "OTROS",
        ),
      ),
    ];

    for (const type of types) {
      if (!type) continue;
      responseMessage += `## *${type}*\n`;

      const productsOfType = listOfProducts.filter(
        (item: Product) => (item.type?.toUpperCase() || "OTROS") === type,
      );

      const brandsMap = new Map<string, string[]>();

      for (const product of productsOfType) {
        let brandName = product.name;
        let variantName = "";

        // Buscar la marca en la lista de marcas conocidas
        const matchedBrand = KNOWN_BRANDS.find((b) =>
          product.name.toLowerCase().includes(b.toLowerCase()),
        );

        if (matchedBrand) {
          // Normalización de ciertos nombres de marca muy comunes
          brandName =
            matchedBrand.toLowerCase() === "jack daniel"
              ? "Jack Daniel's"
              : matchedBrand.toLowerCase() === "havana"
                ? "Havana Club"
                : matchedBrand.toLowerCase() === "dona camila"
                  ? "Doña Camila"
                  : matchedBrand.toLowerCase() === "absolut"
                    ? "Absolut Clásico"
                    : matchedBrand;

          // Limpiar el nombre original para obtener solo la "variante" y el tamaño
          // Se quita el prefijo común (Whisky, Ron, Gin, etc) y el nombre de la marca
          variantName = product.name
            .replace(new RegExp(matchedBrand, "ig"), "")
            .replace(
              /^(Whisky|Ron con caf[eé]|Ron|Licor|Gin|Aguardiente|Tequila|Vodka|Energy_drink)\s*/i,
              "",
            )
            .trim();

          // Limpieza adicional: Si es solo "1 Lt" lo quitamos para que quede la marca pura
          // a menos que tenga más texto (ej: "Miel 1 Lt")
          if (variantName.toLowerCase() === "1 lt") {
            variantName = "";
          }
        } else {
          // Fallback: al menos removemos la categoría del inicio
          brandName = product.name
            .replace(
              /^(Whisky|Ron|Licor|Gin|Aguardiente|Tequila|Vodka|Energy_drink)\s*/i,
              "",
            )
            .trim();
        }

        // Formatear precio (ej: 15500 -> 15.500)
        const priceStr =
          "$" +
          product.sellPriceClient
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        // Armar el string de la variante
        const displayVariant = variantName
          ? `${variantName} ${priceStr}`
          : priceStr;

        // Inicializar u obtener el array de la marca
        if (!brandsMap.has(brandName)) {
          brandsMap.set(brandName, []);
        }
        brandsMap.get(brandName)!.push(displayVariant);
      }

      // Armar las lineas por marca unidas por '|'
      const entries = Array.from(brandsMap.entries());
      for (const [brand, variants] of entries) {
        responseMessage += `- *${brand}:* ${variants.join(" | ")}\n`;
      }

      responseMessage += "\n";
    }

    return responseMessage.trim() + "\n";
  },
  {
    name: "list_products",
    description:
      "Devuelve la lista completa de productos y licores con sus precios actuales. No recibe parámetros.",
    returnDirect: true,
  },
);

import "dotenv/config";
import { productCatalogGraph } from "./index";

const result = await productCatalogGraph.invoke({
  messages: [{ role: "user", content: "me da la lista de precios" }],
});

console.log(result.messages.at(-1)?.content);

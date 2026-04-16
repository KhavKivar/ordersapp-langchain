export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

const carts = new Map<string, OrderItem[]>();

export function getCart(threadId: string): OrderItem[] {
  if (!carts.has(threadId)) carts.set(threadId, []);
  return carts.get(threadId)!;
}

export function clearCart(threadId: string): void {
  carts.delete(threadId);
}

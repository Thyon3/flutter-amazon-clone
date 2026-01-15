import { Router, Request, Response } from "express";
import { admin } from "../middlewares/admin";
import { Product } from "../model/product";
import { Order } from "../model/order";

const router = Router();

router.post("/admin/add-product", admin, async (req: Request, res: Response) => {
  try {
    const { name, description, images, quantity, price, category } = req.body;
    let product = new Product({ name, description, images, quantity, price, category });
    product = await product.save();
    res.json(product);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/get-products", admin, async (_req: Request, res: Response) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/get-category-product/:category", admin, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category });
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/admin/delete-product", admin, async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    const product = await Product.findByIdAndDelete(id);
    res.json(product);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/get-orders", admin, async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find({});
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/admin/change-order-status", admin, async (req: Request, res: Response) => {
  try {
    const { status, id } = req.body as { status: number; id: string };
    let order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    order = await order.save();
    res.json(order.status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/analytics", admin, async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find({});
    let totalEarnings = 0;

    for (const order of orders) {
      for (const item of order.products) {
        totalEarnings += item.quantity * item.product.price;
      }
    }

    const categories = ["Mobiles", "Fashion", "Electronics", "Home", "Beauty", "Appliances", "Grocery", "Books", "Essentials"];
    const categoryEarnings: Record<string, number> = {};

    for (const category of categories) {
      categoryEarnings[`${category.toLowerCase()}Earnings`] = await fetchCategoryWiseProductEarning(category);
    }

    res.json({ totalEarnings, ...categoryEarnings });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function fetchCategoryWiseProductEarning(category: string): Promise<number> {
  let earnings = 0;
  const categoryOrders = await Order.find({ "products.product.category": category });

  for (const order of categoryOrders) {
    for (const item of order.products) {
      if (item.product.category === category) {
        earnings += item.quantity * item.product.price;
      }
    }
  }

  return earnings;
}

export default router;

import { Router, Request, Response } from "express";
import { auth } from "../middlewares/auth";
import { User } from "../model/user";
import { Product } from "../model/product";
import { Order } from "../model/order";

const router = Router();

// Get user data
router.get("/", auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user);
    res.json({ ...user?.toObject(), token: req.token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Add to cart
router.post("/api/add-to-cart", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existingItem = user.cart.find((item) => String(item.product._id) === id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({ product: product.toObject() as any, quantity: 1 });
    }

    user = await user.save();
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Remove from cart
router.delete("/api/remove-from-cart/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart = user.cart.filter((item) => String(item.product._id) !== id);
    user = await user.save();
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Save address
router.post("/api/save-address", auth, async (req: Request, res: Response) => {
  try {
    const { address } = req.body as { address: string };
    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.address = address;
    user = await user.save();
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Place order
router.post("/api/order", auth, async (req: Request, res: Response) => {
  try {
    const { cart, totalPrice, address } = req.body as {
      cart: { product: any; quantity: number }[];
      totalPrice: number;
      address: string;
    };

    let products = [];
    for (const cartItem of cart) {
      const product = await Product.findById(cartItem.product._id);
      if (product && product.quantity >= cartItem.quantity) {
        product.quantity -= cartItem.quantity;
        await product.save();
        products.push({ product: product.toObject(), quantity: cartItem.quantity });
      } else {
        return res.status(400).json({ error: `${product?.name || 'Product'} is out of stock` });
      }
    }

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.cart = [];
    user = await user.save();

    const order = await new Order({
      products,
      totalPrice,
      address,
      userId: req.user,
      orderedAt: Date.now(),
      status: 0,
    }).save();

    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get user orders
router.get("/api/orders/me", auth, async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ userId: req.user });
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Wishlist operations
router.post("/api/add-to-wishlist", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exists = user.wishList.some((item) => String(item.product._id) === id);
    if (!exists) {
      user.wishList.push({ product: product.toObject() as any });
      user = await user.save();
    }

    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/remove-from-wishlist/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.wishList = user.wishList.filter((item) => String(item.product._id) !== id);
    user = await user.save();
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

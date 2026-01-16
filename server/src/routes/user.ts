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

// Remove from cart (decrease quantity or remove if quantity is 1)
router.delete("/api/remove-from-cart/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    for (let i = 0; i < user.cart.length; i++) {
      if (String(user.cart[i].product._id) === id) {
        if (user.cart[i].quantity === 1) {
          user.cart.splice(i, 1);
        } else {
          user.cart[i].quantity -= 1;
        }
        break;
      }
    }

    user = await user.save();
    res.json(user.cart);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete from cart completely (remove all quantities)
router.delete("/api/delete-from-cart/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart = user.cart.filter((item) => String(item.product._id) !== id);
    user = await user.save();
    res.json(user.cart);
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

// Place order - Buy Now (single product)
router.post("/api/place-order-buy-now", auth, async (req: Request, res: Response) => {
  try {
    const { id, totalPrice, address } = req.body as {
      id: string;
      totalPrice: number;
      address: string;
    };

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.quantity < 1) {
      return res.status(400).json({ error: `${product.name} is out of stock` });
    }

    const order = await new Order({
      products: [{ product: product.toObject(), quantity: 1 }],
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

// Search orders by product name
router.get("/api/orders/search/:name", auth, async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({
      "products.product.name": { $regex: req.params.name, $options: "i" },
      userId: req.user,
    });
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Save for Later operations
router.get("/api/get-save-for-later", auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.saveForLater);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/save-for-later", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Add to save for later
    user.saveForLater.push({ product: product.toObject() as any });

    // Remove from cart
    user.cart = user.cart.filter((item) => String(item.product._id) !== id);
    user = await user.save();

    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/api/delete-from-later/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.saveForLater = user.saveForLater.filter((item) => String(item.product._id) !== id);
    user = await user.save();
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/move-to-cart", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove from save for later
    user.saveForLater = user.saveForLater.filter((item) => String(item.product._id) !== id);

    // Add to cart
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

// Keep Shopping For operations
router.get("/api/add-keep-shopping-for/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove if already exists (to add at the end)
    user.keepShoppingFor = user.keepShoppingFor.filter(
      (item) => String(item.product._id) !== id
    );

    // Add to the end
    user.keepShoppingFor.push({ product: product.toObject() as any });
    user = await user.save();

    res.json(user.keepShoppingFor);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/get-keep-shopping-for", auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    const productList = user.keepShoppingFor.map((item) => item.product);
    res.json(productList);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Wishlist operations
router.get("/api/get-wish-list", auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    const wishList = user.wishList.map((item) => item.product);
    res.json(wishList);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/add-to-wish-list", auth, async (req: Request, res: Response) => {
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

router.delete("/api/delete-from-wish-list/:id", auth, async (req: Request, res: Response) => {
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

router.get("/api/is-wishlisted/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isFound = user.wishList.some((item) => String(item.product._id) === id);
    res.json(isFound);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/add-to-cart-from-wish-list", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let user = await User.findById(req.user);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove from wishlist
    user.wishList = user.wishList.filter((item) => String(item.product._id) !== id);

    // Add to cart
    const existingItem = user.cart.find((item) => String(item.product._id) === id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({ product: product.toObject() as any, quantity: 1 });
    }

    user = await user.save();

    const wishList = user.wishList.map((item) => item.product);
    res.json(wishList);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

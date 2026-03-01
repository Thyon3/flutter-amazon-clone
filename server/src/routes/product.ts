import { Router, Request, Response } from "express";
import { auth } from "../middlewares/auth";
import { Product } from "../model/product";

const router = Router();

router.get("/api/products", auth, async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) ?? "";
    const products = await Product.find({ category });
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get(
  "/api/products/search/:name",
  auth,
  async (req: Request, res: Response) => {
    try {
      const products = await Product.find({
        name: { $regex: req.params.name, $options: "i" },
      });
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

router.post("/api/rate-product", auth, async (req: Request, res: Response) => {
  try {
    const { id, rating, review } = req.body as {
      id: string;
      rating: number;
      review?: string;
    };
    let product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.ratings = product.ratings.filter(
      (r) => String(r.userId) !== req.user
    );
    product.ratings.push({ userId: req.user!, rating, review });
    product = await product.save();

    res.json(product);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/product-reviews/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Filter out ratings that don't have a review
    const reviews = product.ratings.filter((r) => r.review && r.review.length > 0);
    res.json(reviews);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/get-product-rating/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const userRating = product.ratings.find((r) => String(r.userId) === req.user);
    res.json(userRating?.rating ?? -1.0);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/api/get-ratings-average/:id", auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const ratingSum = product.ratings.reduce((s, r) => s + (r.rating || 0), 0);
    const averageRating = product.ratings.length ? ratingSum / product.ratings.length : 0;
    res.json(averageRating);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get(
  "/api/get-average-ratings-length/:id",
  auth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product.ratings.length);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

router.get("/api/deal-of-the-day", auth, async (req: Request, res: Response) => {
  try {
    let products = await Product.find({});
    products = products.sort((a, b) => {
      const aTotalRatings = a.ratings.length;
      const bTotalRatings = b.ratings.length;
      return aTotalRatings < bTotalRatings ? 1 : -1;
    });
    res.json(products[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

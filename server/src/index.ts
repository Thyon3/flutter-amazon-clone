import path from "path";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { generalLimiter, authLimiter, searchLimiter, productCreationLimiter, orderLimiter, ratingLimiter } from "./middlewares/rateLimiter";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import productRouter from "./routes/product";
import userRouter from "./routes/user";
import offersRouter from "./routes/offers";
import analyticsRouter from "./routes/analytics";
import emailMarketingRouter from "./routes/emailMarketing";
import priceAlertsRouter from "./routes/priceAlerts";

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const app = express();
const PORT = process.env.PORT || 3000;
const userName = process.env.DB_USERNAME as string;
const password = encodeURIComponent(process.env.DB_PASSWORD || "");
const DB = `mongodb+srv://${userName}:${password}@cluster0.fkliyeh.mongodb.net/flutterzon?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Apply specific rate limiting to different route groups
app.use('/api/', authLimiter, authRouter);
app.use('/admin/', productCreationLimiter, adminRouter);
app.use('/api/products', searchLimiter, productRouter);
app.use('/api/', orderLimiter, userRouter);
app.use('/api/', ratingLimiter, offersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/email', emailMarketingRouter);
app.use('/api/price-alerts', priceAlertsRouter);

mongoose
  .connect(DB)
  .then(() => console.log("Mongoose Connected!"))
  .catch((e) => console.error(e));

app.get("/flutterzon", (_req, res) => {
  res.send("Welcome to Flutterzon!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Connected at PORT : ${PORT}`);
});

export default app;

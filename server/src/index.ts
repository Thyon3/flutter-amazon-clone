import path from "path";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import productRouter from "./routes/product";

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const app = express();
const PORT = process.env.PORT || 3000;
const userName = process.env.DB_USERNAME as string;
const password = encodeURIComponent(process.env.DB_PASSWORD || "");
const DB = `mongodb+srv://${userName}:${password}@cluster0.fkliyeh.mongodb.net/flutterzon?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());
app.use(authRouter);
app.use(adminRouter);
app.use(productRouter);

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

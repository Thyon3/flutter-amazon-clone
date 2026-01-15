import { Schema, model, Document } from "mongoose";
import { ratingSchema, IRating } from "./rating";

export interface IProduct extends Document {
  name: string;
  description: string;
  images: string[];
  quantity: number;
  price: number;
  category: string;
  ratings: IRating[];
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  images: [{ type: String, required: true }],
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  ratings: [ratingSchema],
});

export const Product = model<IProduct>("Product", productSchema);

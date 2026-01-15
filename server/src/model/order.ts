import { Schema, model, Document } from "mongoose";
import { IProduct } from "./product";

export interface IOrder extends Document {
  products: { product: IProduct; quantity: number }[];
  totalPrice: number;
  address: string;
  userId: string;
  orderedAt: number;
  status: number;
}

const orderSchema = new Schema<IOrder>({
  products: [
    {
      product: { type: Object, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  totalPrice: { type: Number, required: true },
  address: { type: String, required: true },
  userId: { type: String, required: true },
  orderedAt: { type: Number, required: true },
  status: { type: Number, default: 0 },
});

export const Order = model<IOrder>("Order", orderSchema);

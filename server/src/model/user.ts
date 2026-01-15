import { Schema, model, Document } from "mongoose";
import { IProduct } from "./product";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  address: string;
  type: "user" | "admin";
  cart: { product: IProduct; quantity: number }[];
  saveForLater: { product: IProduct }[];
  keepShoppingFor: { product: IProduct }[];
  wishList: { product: IProduct }[];
}

const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;

const productSchemaRef = new Schema<IProduct>({ _id: false }, { strict: false });

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value: string) => emailRegex.test(value),
      message: "Please enter a valid email address",
    },
  },
  password: {
    type: String,
    required: true,
    minlength: [6, "Password must have at least 6 characters"],
  },
  address: { type: String, default: "" },
  type: { type: String, default: "user" },
  cart: [
    {
      product: productSchemaRef,
      quantity: { type: Number, required: true },
    },
  ],
  saveForLater: [
    {
      product: productSchemaRef,
    },
  ],
  keepShoppingFor: [
    {
      product: productSchemaRef,
    },
  ],
  wishList: [
    {
      product: productSchemaRef,
    },
  ],
});

export const User = model<IUser>("User", userSchema);

import { Schema } from "mongoose";

export interface IRating {
  userId: string;
  rating: number;
}

export const ratingSchema = new Schema<IRating>({
  userId: { type: String, required: true },
  rating: { type: Number, required: true },
});

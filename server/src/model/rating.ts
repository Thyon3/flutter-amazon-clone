import { Schema } from "mongoose";

export interface IRating {
  userId: string;
  rating: number;
  review?: string;
}

export const ratingSchema = new Schema<IRating>({
  userId: { type: String, required: true },
  rating: { type: Number, required: true },
  review: { type: String, trim: true },
});

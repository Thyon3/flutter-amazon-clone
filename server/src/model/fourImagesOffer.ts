import { Schema, model, Document } from "mongoose";

export interface IFourImagesOffer extends Document {
  label: string;
  images: string[];
}

const fourImagesOfferSchema = new Schema<IFourImagesOffer>({
  label: { type: String, required: true },
  images: [{ type: String, required: true }],
});

export const FourImagesOffer = model<IFourImagesOffer>("FourImagesOffer", fourImagesOfferSchema);

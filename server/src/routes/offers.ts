import { Router, Request, Response } from "express";
import { admin } from "../middlewares/admin";
import { FourImagesOffer } from "../model/fourImagesOffer";

const router = Router();

router.post("/admin/add-four-image-offer", admin, async (req: Request, res: Response) => {
  try {
    const { label, images } = req.body as { label: string; images: string[] };
    let offer = new FourImagesOffer({ label, images });
    offer = await offer.save();
    res.json(offer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/admin/get-offers", admin, async (_req: Request, res: Response) => {
  try {
    const offers = await FourImagesOffer.find({});
    res.json(offers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/admin/delete-offer/:id", admin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const offer = await FourImagesOffer.findByIdAndDelete(id);
    res.json(offer);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

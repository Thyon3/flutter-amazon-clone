import { Request, Response, NextFunction } from "express";
import { auth } from "./auth";

export function admin(req: Request, res: Response, next: NextFunction) {
  auth(req, res, () => {
    try {
      // Simple role check via header for now (to be tied to DB user later)
      const userType = req.header("x-user-type");
      if (userType !== "admin") return res.status(401).json({ msg: "Admin access denied" });
      next();
    } catch (e: any) {
      return res.status(500).json({ msg: e.message });
    }
  });
}

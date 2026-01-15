import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header("x-auth-token");
    if (!token) return res.status(401).json({ msg: "No auth token, access denied" });

    const verified = jwt.verify(token, "passwordKey") as { id: string };
    if (!verified) return res.status(401).json({ msg: "Token verification failed" });

    req.user = verified.id;
    req.token = token;
    next();
  } catch (e: any) {
    return res.status(500).json({ msg: e.message });
  }
}

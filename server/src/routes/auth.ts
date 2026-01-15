import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../model/user";

const router = Router();

router.post("/api/signup", async (req: Request, res: Response) => {
  try {
    let { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    email = email.toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User with same email already exists" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must have at least 6 characters" });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await new User({ email, password: hashedPassword, name }).save();

    res.json(user);
  } catch (e: any) {
    res.status(500).json({ msg: e.message });
  }
});

router.post("/api/signin", async (req: Request, res: Response) => {
  try {
    let { email, password } = req.body as { email: string; password: string };
    email = email.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User does not exist!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Incorrect password!" });

    const token = jwt.sign({ id: user._id }, "passwordKey");
    res.json({ token, ...user.toObject() });
  } catch (e: any) {
    res.status(500).json({ msg: e.message });
  }
});

router.get("/IsTokenValid", async (req: Request, res: Response) => {
  try {
    const token = req.header("x-auth-token");
    if (!token) return res.json(false);

    const isVerified = jwt.verify(token, "passwordKey") as { id: string } | null;
    if (!isVerified) return res.json(false);

    const user = await User.findById(isVerified.id);
    if (!user) return res.json(false);

    res.json(true);
  } catch (e: any) {
    res.status(500).json({ msg: e.message });
  }
});

export default router;

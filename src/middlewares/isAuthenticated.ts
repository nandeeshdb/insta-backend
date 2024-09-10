import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        message: "User is not authenticated",
        success: false,
      });
    }

    const decode = jwt.verify(token, process.env.SECRET_KEY || "");

    if (typeof decode === "string" || !("userId" in decode)) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }

    req.id = (decode as JwtPayload).userId;
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

export default isAuthenticated;

import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv"

dotenv.config({});

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Corrected route handler with both req and res
app.get('/', (req: Request, res: Response) => {
    req
  return res.status(200).json({
    message: 'aaa',
    success: true
  });
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

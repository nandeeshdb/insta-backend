import express, { Response } from "express";
// import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', ( res: Response) => {
  return res.status(200).json({
    message: 'aaa',
    success: true
  });
});

// const corsOption = {
//   origin: 'http://localhost:5173',
//   credentials: true
// };

const PORT = 8000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

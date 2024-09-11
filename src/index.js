import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv"
import cors from "cors"
import userRoutes from "./routes/user.route.js"
import postRoutes from "./routes/post.route.js"
import connectDB from "./utils/db.js"

dotenv.config({});

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
const corsOptions = {
  origin:'http://localhost:5173',
  credentials:true
}

app.use(cors(corsOptions))

app.use("/api/v1/user",userRoutes)
app.use("/api/v1/post",postRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  connectDB()
  console.log('Server running on port ' + PORT);
});

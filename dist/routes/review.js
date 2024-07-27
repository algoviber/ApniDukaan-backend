import express from "express";
import { getAllReviews, newReview } from "../controllers/review.js";
const app = express.Router();
app.post("/new", newReview);
app.get("/all/:id", getAllReviews);
export default app;

import { TryCatch } from "../middlewares/error.js";
import { Product } from "../models/product.js";
import { Review } from "../models/review.js";
import ErrorHandler from "../utils/utility-class.js";
export const newReview = TryCatch(async (req, res, next) => {
    const { userId } = req.query;
    const { productId } = req.query;
    const { reviewText, rating } = req.body;
    if (!rating) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }
    await Review.create({
        userId,
        reviewText,
        rating,
        productId,
    });
    const reviewData = await Review.find({ productId });
    let avgRate = 0;
    if (reviewData && reviewData.length > 0) {
        const totalRating = reviewData.reduce((acc, review) => acc + review.rating, 0);
        const numReviews = reviewData.length;
        avgRate = Math.ceil((totalRating) / (numReviews));
    }
    await Product.findByIdAndUpdate({ _id: productId }, {
        rating: avgRate,
    });
    return res.status(201).json({
        success: true,
        message: "Review created Successfully",
    });
});
export const getAllReviews = TryCatch(async (req, res, next) => {
    const productId = req.params.id;
    console.log(productId);
    const limitedReviews = await Review.find({ productId }).sort({ createdAt: -1 }).limit(10);
    const reviews = await Review.find({ productId });
    return res.status(201).json({
        success: true,
        limitedReviews,
        reviews
    });
});

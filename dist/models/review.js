import mongoose from "mongoose";
const schema = new mongoose.Schema({
    userId: {
        type: String,
    },
    productId: {
        type: String,
    },
    rating: {
        type: Number,
        default: 0,
    },
    reviewText: {
        type: String,
    },
}, {
    timestamps: true,
});
export const Review = mongoose.model("Review", schema);

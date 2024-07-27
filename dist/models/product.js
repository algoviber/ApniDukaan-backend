import mongoose from "mongoose";
const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter Name"],
    },
    photo: {
        public_id: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    price: {
        type: Number,
        required: [true, "Please enter Price"],
    },
    stock: {
        type: Number,
        required: [true, "Please enter Stock"],
    },
    category: {
        type: String,
        required: [true, "Please enter Product Category"],
        trim: true,
    },
    productId: {
        type: String,
    },
    description: {
        type: String,
        required: [true, "Please enter Product Description"],
    },
    rating: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
export const Product = mongoose.model("Product", schema);

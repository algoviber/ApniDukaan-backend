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
    rating: {
        type: Number,
        default: 0,
    },
    category: {
        type: String,
        required: [true, "Please enter Product Category"],
        trim: true,
    },
    deliveryAddress: {
        type: String,
        required: [true, "Please enter your Shop Address"],
    },
    _shopId: {
        type: String,
    },
}, {
    timestamps: true,
});
export const Shop = mongoose.model("Shop", schema);

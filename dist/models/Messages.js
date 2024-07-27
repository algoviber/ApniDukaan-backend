import mongoose from "mongoose";
const schema = new mongoose.Schema({
    userId: {
        type: String,
    },
    text: {
        type: String,
    },
    timeStamp: {
        type: Date,
    },
});
export const Message = mongoose.model("Message", schema);

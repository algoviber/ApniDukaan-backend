import express from "express";
import { connectDB } from "./utils/features.js";

import { errorMiddleware } from "./middlewares/error.js";

import NodeCache from "node-cache";
import {config} from "dotenv";
import morgan from 'morgan';
import Stripe from "stripe";
import cors from "cors";

import {Server} from "socket.io";
import { createServer } from "http";

//importing Routes
import userRoute from "./routes/user.js";
import productRoute from "./routes/products.js";
import orderRoute from "./routes/order.js";
import paymentRoute from "./routes/payment.js";
import shopRoute from "./routes/shops.js";
import reviewRoute from "./routes/review.js";

import dashboardRoute from "./routes/stats.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { Message } from "./models/Messages.js";


const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET","POST"],
        credentials: true,
    },
});

config({
    path: "./.env",
})

const port = process.env.PORT || 4000;
const mongoURI = process.env.MONGO_URI || "";
const stripeKey = process.env.STRIPE_KEY || "";

connectDB(mongoURI);

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API,
    api_secret: process.env.CLOUDINARY_SECRET,
});

export const stripe = new Stripe(stripeKey);

export const myCache = new NodeCache();

app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

const users=[{}];
io.on('connection', (socket) => {
    console.log(`a user connected ${socket.id}`);

    socket.on('submitReview', (reviewData) => {
        // Broadcast the review to all connected clients
        io.emit('newReview', reviewData);
    });

    socket.on('loadMessages', async ({ page, limit }) => {
        const messages = await Message.find()
          .sort({ timeStamp: -1 })
          .skip(page * limit)
          .limit(limit)
          .exec();

        console.log(messages);
        socket.emit('loadMessages', messages.reverse()); // reverse to show the oldest message first
      });

    socket.on('newMessage',(data)=>{
        const newMessage = new Message({userId: data.message.userId,text: data.message.text,timeStamp: data.message.timestamp});
        newMessage.save().then(() => {
        io.emit('sendMessage', data);
        });
    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});




app.get("/", (req,res)=>{
    res.send("API Working with /api/v1");
})

app.use("/api/v1/user",userRoute);
app.use("/api/v1/product",productRoute);
app.use("/api/v1/order",orderRoute);
app.use("/api/v1/payment",paymentRoute);
app.use("/api/v1/shop",shopRoute);
app.use("/api/v1/review",reviewRoute);



app.use("/api/v1/dashboard",dashboardRoute);





app.use("/uploads",express.static("uploads"));
app.use(errorMiddleware);

server.listen(port,()=>{
    console.log(`Server is working on http://localhost:${port}`);
});
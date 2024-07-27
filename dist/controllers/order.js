import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";
export const newOrder = TryCatch(async (req, res, next) => {
    const { shippingInfo, orderItems, user, subTotal, tax, shippingCharges, discount, total, shopId, } = req.body;
    if (!shippingInfo ||
        !orderItems ||
        !user ||
        !subTotal ||
        !tax ||
        !shippingCharges ||
        !discount ||
        !total)
        return next(new ErrorHandler("Please enter all fields!", 400));
    const order = await Order.create({
        shippingInfo,
        orderItems,
        user,
        subTotal,
        tax,
        shippingCharges,
        discount,
        total,
        shopId,
    });
    await reduceStock(orderItems);
    invalidateCache({
        product: true,
        order: true,
        admin: true,
        userId: user,
        productId: order.orderItems.map(i => String(i.productId))
    });
    return res.status(201).json({
        success: true,
        message: "Order Placed Successfully!!",
    });
});
export const myOrders = TryCatch(async (req, res, next) => {
    const { id } = req.query;
    const key = `my-orders-${id}`;
    let orders = [];
    if (myCache.has(key))
        orders = JSON.parse(myCache.get(key));
    else {
        orders = await Order.find({ user: String(id) });
        myCache.set(key, JSON.stringify(orders));
    }
    return res.status(200).json({
        success: true,
        orders,
    });
});
export const allOrders = TryCatch(async (req, res, next) => {
    const key = `all-orders`;
    const { id } = req.query;
    const shopId = String(id);
    let orders = [];
    if (myCache.has(key))
        orders = JSON.parse(myCache.get(key));
    else {
        orders = await Order.find({ shopId: shopId }).populate("user", "name");
        myCache.set(key, JSON.stringify(orders));
    }
    return res.status(200).json({
        success: true,
        orders,
    });
});
export const getSingleOrder = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const key = `order-${id}`;
    let order;
    //if(myCache.has(key)) order= JSON.parse(myCache.get(key) as string);
    // else{
    order = await Order.findById(id).populate("user", "name");
    if (!order)
        return next(new ErrorHandler("Order Not Found!!", 404));
    myCache.set(key, JSON.stringify(order));
    //}
    return res.status(200).json({
        success: true,
        order,
    });
});
export const processOrder = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order)
        return next(new ErrorHandler("Order not Found!!", 404));
    switch (order.status) {
        case "Processing":
            order.status = "Shipped";
            break;
        case "Shipped":
            order.status = "Delieverd";
            break;
        default:
            order.status = "Delieverd";
            break;
    }
    await order.save();
    invalidateCache({
        product: false,
        order: true,
        admin: true,
        userId: order.user,
        orderId: id
    });
    return res.status(200).json({
        success: true,
        message: "Order Processed Successfully!!",
    });
});
export const deleteOrder = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order)
        return next(new ErrorHandler("Order not Found!!", 404));
    await order.deleteOne();
    invalidateCache({
        product: false,
        order: true,
        admin: true,
        userId: order.user,
        orderId: id
    });
    return res.status(200).json({
        success: true,
        message: "Order Deleted Successfully!!",
    });
});

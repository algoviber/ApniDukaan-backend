import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, getChartData, getInventories } from "../utils/features.js";
export const getDashboardStats = TryCatch(async (req, res, next) => {
    let stats = {};
    const { id } = req.query;
    const productId = String(id);
    const shopId = String(id);
    const key = "admin-stats";
    if (myCache.has(key))
        stats = JSON.parse(myCache.get(key));
    else {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today,
        };
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0),
        };
        const thisMonthProductsPromise = Product.find({
            productId: productId,
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        });
        const lastMonthProductsPromise = Product.find({
            productId: productId,
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        });
        const thisMonthUsersPromise = Order.find({
            shopId: shopId,
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        }).distinct("user");
        const lastMonthUsersPromise = Order.find({
            shopId: shopId,
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        }).distinct("user");
        const thisMonthOrdersPromise = Order.find({
            shopId: shopId,
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end,
            }
        });
        const lastMonthOrdersPromise = Order.find({
            shopId: shopId,
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end,
            }
        });
        const lastSixMonthOrdersPromise = Order.find({
            shopId: shopId,
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            }
        });
        const latestTransactionsPromise = Order.find({
            shopId: shopId
        }).select(["orderItems", "discount", "total", "status"]).limit(4);
        const [thisMonthProducts, thisMonthUsers, thisMonthOrders, lastMonthProducts, lastMonthUsers, lastMonthOrders, productsCount, usersCount, allOrders, lastSixMonthOrders, categories, femaleUsersCount, latestTransaction,] = await Promise.all([
            thisMonthProductsPromise,
            thisMonthUsersPromise,
            thisMonthOrdersPromise,
            lastMonthProductsPromise,
            lastMonthUsersPromise,
            lastMonthOrdersPromise,
            Product.countDocuments({ productId: productId }),
            Order.find({ shopId: shopId }).distinct("user").countDocuments(),
            Order.find({ shopId: shopId }).select("total"),
            lastSixMonthOrdersPromise,
            Product.find({ productId: productId }).distinct("category"),
            User.countDocuments({ gender: "female" }),
            latestTransactionsPromise,
        ]);
        const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (order.total || 0), 0);
        const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + (order.total || 0), 0);
        const changePercent = {
            revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
            product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),
            user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
            order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length),
        };
        const revenue = allOrders.reduce((total, order) => total + (order.total || 0), 0);
        const count = {
            revenue,
            user: usersCount,
            product: productsCount,
            order: allOrders.length,
        };
        const orderMonthCounts = getChartData({ length: 12, docArr: lastSixMonthOrders });
        const orderMonthRevenue = getChartData({ length: 12, docArr: lastSixMonthOrders, property: "total" });
        console.log(orderMonthRevenue);
        console.log(orderMonthCounts);
        const categoryAndCount = await getInventories({ categories, productsCount, productId });
        const genderRatio = {
            male: usersCount - femaleUsersCount,
            female: femaleUsersCount,
        };
        const modifiedLatestTransaction = latestTransaction.map((i) => ({
            _id: i._id,
            discount: i.discount,
            amount: i.total,
            quantity: i.orderItems.length,
            status: i.status,
        }));
        stats = {
            categoryAndCount,
            changePercent,
            count,
            chart: {
                order: orderMonthCounts,
                revenue: orderMonthRevenue,
            },
            genderRatio,
            latestTransaction: modifiedLatestTransaction,
        };
        myCache.set(key, JSON.stringify(stats));
    }
    return res.status(200).json({
        success: true,
        stats,
    });
});
export const getPieCharts = TryCatch(async (req, res, next) => {
    let charts;
    const { id } = req.query;
    const productId = String(id);
    const shopId = String(id);
    const key = "admin-pie-charts";
    if (myCache.has(key))
        charts = JSON.parse(myCache.get(key));
    else {
        const allOrderPromise = Order.find({ shopId: shopId }).select(["total", "discount", "subTotal", "tax", "shippingCharges",]);
        const [processingOrder, shippedOrder, deliveredOrder, categories, productsCount, productsOutOfStock, allOrders, allUsers, admins, customers,] = await Promise.all([
            Order.find({ shopId: shopId }).countDocuments({ status: "Processing" }),
            Order.find({ shopId: shopId }).countDocuments({ status: "Shipped" }),
            Order.find({ shopId: shopId }).countDocuments({ status: "Delivered" }),
            Product.find({ productId: productId }).distinct("category"),
            Product.find({ productId: productId }).countDocuments(),
            Product.find({ productId: productId }).countDocuments({ stock: 0 }),
            allOrderPromise,
            User.find({}).select("dob"),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "user" }),
        ]);
        const orderFullfillment = {
            processing: processingOrder,
            shipped: shippedOrder,
            delivered: deliveredOrder,
        };
        const productCategories = await getInventories({ categories, productsCount, productId });
        const stockAvailability = {
            inStock: productsCount - productsOutOfStock,
            outOfStock: productsOutOfStock,
        };
        const grossIncome = allOrders.reduce((prev, order) => prev + (order.total || 0), 0);
        const discount = allOrders.reduce((prev, order) => prev + (order.discount || 0), 0);
        const productionCost = allOrders.reduce((prev, order) => prev + (order.shippingCharges || 0), 0);
        const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);
        const marketing_percent = Number(process.env.MARKETINGCOST_PERCENT);
        const marketingCost = Math.round(grossIncome * (marketing_percent / 100));
        const netMargin = grossIncome - discount - burnt - marketingCost;
        const revenueDistribution = {
            netMargin,
            discount,
            productionCost,
            burnt,
            marketingCost,
        };
        const usersAgeGroup = {
            teen: allUsers.filter((i) => i.age < 20).length,
            adult: allUsers.filter((i) => i.age >= 20 && i.age < 40).length,
            old: allUsers.filter((i) => i.age >= 40).length,
        };
        const adminCustomer = {
            admins,
            customers,
        };
        charts = {
            orderFullfillment,
            productCategories,
            stockAvailability,
            revenueDistribution,
            usersAgeGroup,
            adminCustomer,
        };
        myCache.set(key, JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts,
    });
});
export const getBarCharts = TryCatch(async (req, res, next) => {
    let charts;
    const { id } = req.query;
    const productId = String(id);
    const shopId = String(id);
    const key = "admin-bar-charts";
    if (myCache.has(key))
        charts = JSON.parse(myCache.get(key));
    else {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const sixMonthProductPromise = Product.find({
            productId: productId,
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            },
        }).select("createdAt");
        const sixMonthUsersPromise = User.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            },
        }).select("createdAt");
        const twelveMonthOrdersPromise = Order.find({
            shopId: shopId,
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            },
        }).select("createdAt");
        const [products, users, orders] = await Promise.all([
            sixMonthProductPromise,
            sixMonthUsersPromise,
            twelveMonthOrdersPromise
        ]);
        const productsCounts = getChartData({ length: 6, docArr: products });
        const usersCounts = getChartData({ length: 6, docArr: users });
        const ordersCounts = getChartData({ length: 12, docArr: orders });
        charts = {
            users: usersCounts,
            products: productsCounts,
            orders: ordersCounts,
        };
        myCache.set(key, JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts,
    });
});
export const getLineCharts = TryCatch(async (req, res, next) => {
    let charts;
    const { id } = req.query;
    const productId = String(id);
    const shopId = String(id);
    const key = "admin-line-charts";
    if (myCache.has(key))
        charts = JSON.parse(myCache.get(key));
    else {
        const today = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const baseQuery = {
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            },
        };
        const twelveMonthProductsPromise = Product.find({ productId: productId, createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            } }).select("createdAt");
        const twelveMonthUsersPromise = User.find(baseQuery).select("createdAt");
        const twelveMonthOrdersPromise = Order.find({ shopId: shopId, createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            } }).select(["createdAt", "discount", "total"]);
        const [products, users, orders] = await Promise.all([
            twelveMonthProductsPromise,
            twelveMonthUsersPromise,
            twelveMonthOrdersPromise
        ]);
        const productsCounts = getChartData({ length: 12, docArr: products });
        const usersCounts = getChartData({ length: 12, docArr: users });
        const discount = getChartData({ length: 12, docArr: orders, property: "discount" });
        const revenue = getChartData({ length: 12, docArr: orders, property: "total" });
        charts = {
            users: usersCounts,
            products: productsCounts,
            discount,
            revenue,
        };
        myCache.set(key, JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts,
    });
});

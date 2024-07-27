import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "cloudinary";
import { Shop } from "../models/shop.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
export const newShop = TryCatch(async (req, res, next) => {
    const { id } = req.query;
    if (!id)
        return next(new ErrorHandler("Please Login First.", 401));
    const _shopId = String(id);
    const { name, category, deliveryAddress } = req.body;
    const photo = req.file;
    if (!photo)
        return next(new ErrorHandler("Please add Photo.", 400));
    if (!name || !category || !deliveryAddress) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }
    const photoUri = getDataUri(photo);
    const mycloud = await cloudinary.v2.uploader.upload(String(photoUri?.content));
    await Shop.create({
        name,
        category: category.toLowerCase(),
        photo: {
            public_id: String(mycloud.public_id),
            url: String(mycloud.secure_url),
        },
        deliveryAddress,
        _shopId,
    });
    invalidateCache({ shop: true });
    await User.findByIdAndUpdate(id, {
        role: "admin",
    });
    return res.status(201).json({
        success: true,
        message: "Shop created Successfully",
    });
});
//Revalidate on new update or delete
export const getShopsByAddress = TryCatch(async (req, res, next) => {
    let shops;
    const { deliveryAddress } = req.query;
    if (deliveryAddress)
        shops = await Shop.find({ deliveryAddress: { $regex: String(deliveryAddress), $options: 'i' } });
    else {
        return next(new ErrorHandler("Not Delivering to your location.", 404));
    }
    return res.status(200).json({
        success: true,
        shops,
    });
});
export const getlatestShops = TryCatch(async (req, res, next) => {
    let shops;
    if (myCache.has("latest-shops"))
        shops = JSON.parse(myCache.get("latest-shops"));
    else {
        shops = await Shop.find({}).sort({ createdAt: -1 }).limit(5);
        myCache.set("latest-shops", JSON.stringify(shops));
    }
    return res.status(200).json({
        success: true,
        shops,
    });
});
export const getAllShopCategories = TryCatch(async (req, res, next) => {
    let categories;
    if (myCache.has("shop-categories")) {
        categories = JSON.parse(myCache.get("shop-categories"));
    }
    else {
        categories = await Shop.distinct("category");
        myCache.set("shop-categories", JSON.stringify(categories));
    }
    return res.status(200).json({
        success: true,
        categories,
    });
});
export const getAdminShops = TryCatch(async (req, res, next) => {
    let shops;
    if (myCache.has("all-shops"))
        shops = JSON.parse(myCache.get("all-shops"));
    else {
        shops = await Shop.find({});
        myCache.set("all-shops", JSON.stringify(shops));
    }
    return res.status(200).json({
        success: true,
        shops,
    });
});
export const getSingleShop = TryCatch(async (req, res, next) => {
    let shop;
    const id = req.params.id;
    if (myCache.has(`shop-${id}`)) {
        shop = JSON.parse(myCache.get(`shop-${id}`));
    }
    else {
        shop = await Shop.findById(id);
        if (!shop)
            return next(new ErrorHandler("Shop Not Found!!", 404));
        myCache.set(`shop-${id}`, JSON.stringify(shop));
    }
    return res.status(200).json({
        success: true,
        shop,
    });
});
export const getSingleShopProducts = TryCatch(async (req, res, next) => {
    let shop;
    const id = req.params.id;
    shop = await Shop.findById(id);
    if (!shop)
        return next(new ErrorHandler("Shop Not Found!!", 404));
    const products = await Product.find({ productId: shop._shopId });
    return res.status(200).json({
        success: true,
        shop,
        products
    });
});
export const updateShop = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { name, deliveryAddress, category } = req.body;
    const photo = req.file;
    const shop = await Shop.findById(id);
    if (!shop)
        return next(new ErrorHandler("Shop Not Found!!", 404));
    if (photo) {
        const photoUri = getDataUri(photo);
        const mycloud = await cloudinary.v2.uploader.upload(String(photoUri?.content));
        shop.photo = {
            url: mycloud.secure_url,
            public_id: mycloud.public_id,
        };
    }
    if (name)
        shop.name = name;
    if (deliveryAddress)
        shop.deliveryAddress = deliveryAddress;
    if (category)
        shop.category = category;
    await shop.save();
    invalidateCache({ shop: true, shopId: String(shop._id) });
    return res.status(200).json({
        success: true,
        message: "Shop updated Successfully",
    });
});
export const deleteShop = TryCatch(async (req, res, next) => {
    const shop = await Shop.findById(req.params.id);
    if (!shop)
        return next(new ErrorHandler("Shop Not Found!!", 404));
    await shop.deleteOne();
    invalidateCache({ shop: true, shopId: String(shop._id) });
    return res.status(200).json({
        success: true,
        message: "Shop deleted Successfully",
    });
});
export const searchAllshops = TryCatch(async (req, res, next) => {
    const { search, deliveryAddress } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.shop_PER_PAGE) || 8;
    const skip = limit * (page - 1);
    const baseQuery = {
        $or: [{}]
    };
    if (search) {
        baseQuery.$or.pop();
        baseQuery.$or.push({ name: { $regex: search, $options: "i" } }, { category: { $regex: search, $options: "i" } });
    }
    if (deliveryAddress) {
        baseQuery.deliveryAddress = {
            $regex: deliveryAddress,
            $options: "i",
        };
    }
    const [shops, totalSearchedshops] = await Promise.all([
        Shop.find(baseQuery).sort({ createdAt: -1 }).limit(limit).skip(skip),
        Shop.find(baseQuery),
    ]);
    const totalPage = Math.ceil(totalSearchedshops.length / limit);
    return res.status(200).json({
        success: true,
        shops,
        totalPage,
    });
});

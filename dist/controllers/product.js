import { TryCatch } from "../middlewares/error.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "cloudinary";
export const newProduct = TryCatch(async (req, res, next) => {
    const { id } = req.query;
    const productId = String(id);
    const { name, price, stock, category, description } = req.body;
    const photo = req.file;
    if (!photo)
        return next(new ErrorHandler("Please add Photo.", 400));
    const photoUri = getDataUri(photo);
    const mycloud = await cloudinary.v2.uploader.upload(String(photoUri?.content));
    if (!name || !price || !stock || !category || !description) {
        // rm(photo.path,()=>{
        //     console.log("Deleted");
        // })
        return next(new ErrorHandler("Please enter all fields.", 400));
    }
    await Product.create({
        name, price, stock,
        category: category.toLowerCase(),
        photo: {
            public_id: String(mycloud.public_id),
            url: String(mycloud.secure_url),
        },
        description,
        productId,
    });
    invalidateCache({ product: true, admin: true });
    return res.status(201).json({
        success: true,
        message: "Product created Successfully",
    });
});
//Revalidate on new update or delete
export const getProductsByAddress = TryCatch(async (req, res, next) => {
    let products;
    const { deliveryAddress } = req.query;
    if (deliveryAddress)
        products = await Product.find({ deliveryAddress: { $regex: String(deliveryAddress), $options: 'i' } });
    else {
        return next(new ErrorHandler("Not Delivering to your location.", 404));
    }
    return res.status(200).json({
        success: true,
        products,
    });
});
export const getlatestProducts = TryCatch(async (req, res, next) => {
    let products;
    if (myCache.has("latest-products"))
        products = JSON.parse(myCache.get("latest-products"));
    else {
        products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
        myCache.set("latest-products", JSON.stringify(products));
    }
    return res.status(200).json({
        success: true,
        products,
    });
});
export const getAllCategories = TryCatch(async (req, res, next) => {
    let categories;
    if (myCache.has("categories")) {
        categories = JSON.parse(myCache.get("categories"));
    }
    else {
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories));
    }
    return res.status(200).json({
        success: true,
        categories,
    });
});
export const getAdminProducts = TryCatch(async (req, res, next) => {
    let products;
    const { id } = req.query;
    const productId = String(id);
    if (myCache.has("all-products"))
        products = JSON.parse(myCache.get("all-products"));
    else {
        products = await Product.find({ productId: productId });
        myCache.set("all-products", JSON.stringify(products));
    }
    return res.status(200).json({
        success: true,
        products,
    });
});
export const getSingleProduct = TryCatch(async (req, res, next) => {
    let product;
    const id = req.params.id;
    if (myCache.has(`product-${id}`)) {
        product = JSON.parse(myCache.get(`product-${id}`));
    }
    else {
        product = await Product.findById(id);
        if (!product)
            return next(new ErrorHandler("Product Not Found!!", 404));
        myCache.set(`product-${id}`, JSON.stringify(product));
    }
    product = await Product.findById(req.params.id);
    if (!product)
        return next(new ErrorHandler("Product Not Found!!", 404));
    return res.status(200).json({
        success: true,
        product,
    });
});
export const changeRating = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    const avgRate = req.body;
    // const reviewData = await Review.find({productId:id});
    // let avgRate = 0;
    // if (reviewData && reviewData.length > 0) {
    //     const totalRating = reviewData.reduce((acc, review) => acc + review.rating, 0);
    //     const numReviews = reviewData.length;
    //     avgRate = Math.ceil(totalRating / numReviews);
    // }
    console.log(avgRate);
    await Product.findByIdAndUpdate(id, {
        rating: avgRate,
    });
    return res.status(200).json({
        success: true,
    });
});
export const updateProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { name, price, stock, category, description } = req.body;
    const photo = req.file;
    const product = await Product.findById(id);
    if (!product)
        return next(new ErrorHandler("Product Not Found!!", 404));
    if (photo) {
        const photoUri = getDataUri(photo);
        const mycloud = await cloudinary.v2.uploader.upload(String(photoUri?.content));
        // rm(product.photo!,()=>{
        //     console.log("Old Photo Deleted");
        // });
        //product.photo?.url = mycloud.secure_url;
        product.photo = {
            url: mycloud.secure_url,
            public_id: mycloud.public_id,
        };
    }
    if (name)
        product.name = name;
    if (price)
        product.price = price;
    if (stock)
        product.stock = stock;
    if (category)
        product.category = category;
    if (description)
        product.description = description;
    await product.save();
    invalidateCache({ product: true, productId: String(product._id), admin: true });
    return res.status(200).json({
        success: true,
        message: "Product updated Successfully",
    });
});
export const deleteProduct = TryCatch(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product)
        return next(new ErrorHandler("Product Not Found!!", 404));
    // rm(product.photo!,()=>{
    //     console.log("Product Photo Deleted");
    // });
    await product.deleteOne();
    invalidateCache({ product: true, productId: String(product._id), admin: true });
    return res.status(200).json({
        success: true,
        message: "Product deleted Successfully",
    });
});
export const searchAllProducts = TryCatch(async (req, res, next) => {
    const { search, sort, category, price } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = limit * (page - 1);
    const baseQuery = {};
    if (search) {
        baseQuery.name = {
            $regex: search,
            $options: "i",
        };
    }
    if (price) {
        baseQuery.price = {
            $lte: Number(price),
        };
    }
    if (category)
        baseQuery.category = category;
    const [products, totalSearchedProducts] = await Promise.all([
        Product.find(baseQuery).sort(sort && { price: sort === "asc" ? 1 : -1 }).limit(limit).skip(skip),
        Product.find(baseQuery),
    ]);
    const totalPage = Math.ceil(totalSearchedProducts.length / limit);
    return res.status(200).json({
        success: true,
        products,
        totalPage,
    });
});

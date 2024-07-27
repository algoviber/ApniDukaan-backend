import mongoose, { Document } from "mongoose";
import { InvalidateCacheProps, OrderItemType } from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.js";

export const connectDB = (uri: string)=>{
    mongoose.connect(uri,{
        dbName: "Ecommerce",
    })
    .then(c=> console.log(`DB Connected to ${c.connection.host}`))
    .catch((e)=> console.log(e));
}

export const invalidateCache = ({
    product,
    order,
    admin,
    shop,
    userId,
    orderId,
    productId,
    shopId
    }: InvalidateCacheProps)=>{
    if(product){
        const productKeys: string[]= [
            "latest-products",
            "categories",
            "all-products",
        ];

        if(typeof productId === "string") productKeys.push(`product-${productId}`);

        if(typeof productId === "object") 
        productId.forEach((i) => productKeys.push(`product-${i}`));

        myCache.del(productKeys);
    }
    if(shop){
        const shopKeys: string[]= [
            "latest-shops",
            "shop-categories",
            "all-shops",
        ];

        if(typeof shopId === "string") shopKeys.push(`shop-${shopId}`);

        if(typeof shopId === "object") 
        shopId.forEach((i) => shopKeys.push(`shop-${i}`));

        myCache.del(shopKeys);
    }
    if(order){
        const orderKeys: string[] =["all-orders",`my-orders-${userId}`,`order-${orderId}`];

        myCache.del(orderKeys);
    }
    if(admin){
        myCache.del(["admin-stats","admin-pie-charts","admin-bar-charts","admin-line-charts"]);
    }
}



export const reduceStock = async (orderItems:OrderItemType[]) =>{
    for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i];
        const product = await Product.findById(order.productId);
        if(!product) throw new Error("Product Not Found!");
        product.stock-= order.quantity;
        await product.save();
    }
}


export const calculatePercentage =(thisMonth:number,lastMonth:number)=>{
    
    if(lastMonth===0) return thisMonth*100;

    const percent = ( (thisMonth - lastMonth)/ lastMonth) * 100;

    return Number(percent.toFixed(0));
}


export const getInventories= async ({categories, productsCount, productId}: {categories: string[]; productsCount: number; productId:string; })=>{

    const categoriesCountPromise = categories.map(category=> Product.find({productId:productId}).countDocuments({category}));

        const categoriesCount = await Promise.all(categoriesCountPromise);

        const categoryAndCount: Record<string,number>[]= [];

        categories.forEach((category,i)=>{
            categoryAndCount.push({
                [category]: Math.round((categoriesCount[i]/productsCount)*100),
            });
        });

        return categoryAndCount;

}

interface MyDocument extends Document{
    createdAt: Date;
    discount?: number;
    total?: number;
}

type FuncProps = {
    length:number;
    docArr:MyDocument[];
    property?: "discount" | "total";
}

export const getChartData = ({length,docArr,property}: FuncProps) =>{
    const today = new Date();
    const data: number[]= new Array(length).fill(0);

    docArr.forEach((i)=>{
            const creationDate = i.createdAt;
            const monthDiff = (today.getMonth()-creationDate.getMonth() + 12) % 12;

            if(monthDiff<length){
                data[length-monthDiff-1]+= property? i[property]! : 1;
            }
        });

    return data;
}


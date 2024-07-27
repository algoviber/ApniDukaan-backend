import { NextFunction, Request, Response } from "express";

export interface NewUserRequestBody{
    name: string;
    email: string;
    photo: string;
    gender: string;
    _id: string;
    dob: Date;
}

export interface NewProductRequestBody{
    name: string;
    category: string;
    price: number;
    stock: number;
    description: string;
    productId: string;
}

export interface NewShopRequestBody{
    name: string;
    category: string;
    deliveryAddress: string;
    _shopId: string;
}

export type ControllerType = (
    req: Request, 
    res: Response, 
    next: NextFunction
    ) => 
    Promise<void | Response<any, Record<string, any>>>

export type SearchRequestQuery = {
    search?: string;
    price?: string;
    category?: string;
    sort?: string;
    page?: string;
}

export type SearchShopRequestQuery = {
    search?: string;
    deliveryAddress?: string;
    page?: string;
}

export interface BaseQuery{
    name?:{
        $regex: string;
        $options: string;
    };
    price?:{
        $lte: number;
    };
    category?: string;
};

export interface ShopBaseQuery{
    name?:{
        $regex: string;
        $options: string;
    };
    deliveryAddress?:{
        $regex: string;
        $options: string;
    };
    category?:{
        $regex: string;
        $options: string;
    };
};

export interface ShopBaseQuery{
    $or: [
        {
        name?:{
            $regex: string;
            $options: string;
        },
        category?:{
            $regex: string;
            $options: string;
        }
        }
    ];
    deliveryAddress?:{
        $regex: string;
        $options: string;
    };
};

export type InvalidateCacheProps = {
    product?: boolean;
    order?: boolean;
    admin?: boolean;
    shop?: boolean;
    userId?: string;
    orderId?: string;
    productId?: string | string[];
    shopId?: string | string[];
}

export type OrderItemType={
    name:string;
    photo:string;
    price:number;
    quantity:number;
    productId:string;
};

export type ShippingInfoType={
    address:string;
    city:string;
    state:string;
    country:string;
    pinCode:number;
};

export interface NewOrderRequestBody{
    shippingInfo:ShippingInfoType;
    user: string;
    subTotal: number;
    tax: number;
    shippingCharges: number;
    discount: number;
    total: number;
    shopId: string;
    orderItems:OrderItemType[];
}
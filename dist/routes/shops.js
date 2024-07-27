import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import { singleUpload } from "../middlewares/multer.js";
import { deleteShop, getAdminShops, getAllShopCategories, getShopsByAddress, getSingleShop, getSingleShopProducts, getlatestShops, newShop, searchAllshops, updateShop } from "../controllers/shop.js";
const app = express.Router();
app.post("/new", singleUpload, newShop);
app.get("/address", getShopsByAddress);
app.get("/latest", getlatestShops);
app.get("/all", searchAllshops);
app.get("/categories", getAllShopCategories);
app.get("/admin-shops", adminOnly, getAdminShops);
app.get("/details/:id", getSingleShopProducts);
app
    .route("/:id")
    .get(getSingleShop)
    .put(adminOnly, singleUpload, updateShop)
    .delete(adminOnly, deleteShop);
export default app;

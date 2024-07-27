import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import { changeRating, deleteProduct, getAdminProducts, getAllCategories, getProductsByAddress, getSingleProduct, getlatestProducts, newProduct, searchAllProducts, updateProduct } from "../controllers/product.js";
import { singleUpload } from "../middlewares/multer.js";
const app = express.Router();
app.post("/new", adminOnly, singleUpload, newProduct);
app.get("/latest", getlatestProducts);
//search all products with filters
app.get("/all", searchAllProducts);
app.get("/categories", getAllCategories);
app.get("/address", getProductsByAddress);
app.get("/admin-products", adminOnly, getAdminProducts);
app.put("/change/:id", changeRating);
app
    .route("/:id")
    .get(getSingleProduct)
    .put(adminOnly, singleUpload, updateProduct)
    .delete(adminOnly, deleteProduct);
export default app;

import DataURIParser from "datauri/parser.js";
import path from "path";

const getDataUri = (photo: Express.Multer.File) =>{

    if(!photo) return;

    const parser = new DataURIParser();
    const extName = path.extname(photo.originalname).toString();

    return parser.format(extName,photo.buffer);
}

export default getDataUri;
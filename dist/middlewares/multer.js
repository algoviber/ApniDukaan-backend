import multer from 'multer';
// const storage = multer.diskStorage({
//     destination(req,file,callback){
//         callback(null,"uploads");
//     },
//     filename(req,file,callback){
//         const id = uuid();
//         const ext = file.originalname.split(".").pop();
//         const fileName= `${id}.${ext}`;
//         callback(null,fileName);
//     },
// });
const storage = multer.memoryStorage();
export const singleUpload = multer({ storage }).single("photo");

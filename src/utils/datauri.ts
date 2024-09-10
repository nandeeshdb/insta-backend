import DataURIParser from "datauri/parser";
import path from "path"

const parser = new DataURIParser();
const getDataUri = (file:any)=>{
    const extName = path.extname(file.originalname).toString();
    return parser.format(extName,file.buffer).content
}

export default getDataUri
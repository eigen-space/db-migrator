import fileUpload from 'express-fileupload';

export interface RequestData {
    // eslint-disable-next-line
    params: { [key: string]: any }
    files?: fileUpload.FileArray
}
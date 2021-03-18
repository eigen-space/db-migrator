const { PORT, UPLOAD_DIR } = process.env;

export const env = {
    port: PORT || 4010,
    uploadDirectory: UPLOAD_DIR || '/liquibase/upload'
};
const multer = require('multer');

const dest = 'tmp/';
const fileSizeLimit = 100 * 1000 * 1000; // in byte, by each file
const mimeTypes: string[] = []; // empty: accepts all | 'image/png, image/jpg, ...

/**
   * req.files: array of files
   * {
   *  fieldname: 'fileKey',
   *  originalname: 'anuidade CREA.pdf',
   *  encoding: '7bit',
   *  mimetype: 'application/pdf',
   *  destination: 'tmp/',
   *  filename: 'b6421e231fd48b69ad6d352ad4e5e135',
   *  path: 'tmp\\b6421e231fd48b69ad6d352ad4e5e135',
   *  size: 72704
   * }
   */

const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, dest) // where files will be saved
  },
})
module.exports = multer({
  storage,
  limits: { fileSize: fileSizeLimit },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!mimeTypes.length || mimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      return cb(new Error('Invalid mime type'));
    }
  },
  onError : function(err: any, next: any) {
    // error handler
    next(err);
  }
});

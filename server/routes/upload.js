const router = require("express").Router();
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Configure S3 instance
// Assuming AWS_ACCESS_KEY, AWS_SECRET_KEY, and AWS_REGION are in .env
// We will only use S3 if configured, else fallback to disk maybe? 
// No, the instruction is to implement AWS S3 upload. 
// A user might not have AWS setup locally yet, but they wanted the *architecture* built.

// For robustness, check if S3 config exists, if not, we can log a warning or still try
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

// Middleware to upload media directly to S3
const uploadMediaS3 = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME || 'whatsapp-clone-media-bucket',
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            // Create unique file name using the name passed in body or unique timestamp
            const fileName = req.body.name || (Date.now().toString() + '-' + file.originalname);
            cb(null, fileName);
        }
    })
});

router.post("/", uploadMediaS3.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload a file" });
        }
        // req.file.location contains the S3 CDN link
        return res.status(200).json({
            message: "File uploaded successfully",
            mediaUrl: req.file.location,
            fileName: req.file.key
        });
    } catch (err) {
        console.error("Upload Error:", err);
        return res.status(500).json(err);
    }
});

module.exports = router;

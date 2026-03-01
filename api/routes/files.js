const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const File = require('../models/File');
const verifyToken = require('../middleware/verifyToken');
const axios = require('axios');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary Storage Configuration for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'roblox-assets',
        resource_type: 'raw', // Use raw for non-image files like .zip, .rbxm
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return uniqueSuffix + '-' + file.originalname;
        }
    }
});

// File Validation
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.rbxm', '.rbxl', '.rbxmx', '.zip', '.png', '.jpg', '.jpeg'];
    // In serverless, we check against the originalname
    const hasValidExt = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));

    if (hasValidExt) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed extensions: ${allowedExtensions.join(', ')}`));
    }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // Default 50MB

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: maxFileSize }
});

// GET /api/files - Public: Get all OPEN files
router.get('/', async (req, res) => {
    try {
        const files = await File.find({ status: 'OPEN' }).sort({ uploadDate: -1 });
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching files' });
    }
});

// GET /api/files/all - Admin: Get all files
router.get('/all', verifyToken, async (req, res) => {
    try {
        const files = await File.find().sort({ uploadDate: -1 });
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching files' });
    }
});

// POST /api/files/upload - Admin: Upload file
router.post('/upload', verifyToken, (req, res) => {
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const { name, description, status } = req.body;

        try {
            const newFile = new File({
                name: name || req.file.originalname,
                originalName: req.file.originalname,
                fileUrl: req.file.path,
                cloudinaryId: req.file.filename,
                description: description || '',
                size: req.file.size,
                status: status === 'CLOSED' ? 'CLOSED' : 'OPEN'
            });

            await newFile.save();
            res.status(201).json({ message: 'File uploaded successfully', file: newFile });
        } catch (error) {
            res.status(500).json({ message: 'Database error saving file details' });
        }
    });
});

// PATCH /api/files/:id/status - Admin: Toggle status
router.patch('/:id/status', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'OPEN' && status !== 'CLOSED') {
        return res.status(400).json({ message: 'Status must be OPEN or CLOSED' });
    }

    try {
        const file = await File.findByIdAndUpdate(id, { status }, { new: true });
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.json({ message: `Status updated to ${status}`, file });
    } catch (error) {
        res.status(500).json({ message: 'Database error updating status' });
    }
});

// DELETE /api/files/:id - Admin: Delete file
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const file = await File.findById(id);
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'raw' });

        // Delete from MongoDB
        await File.findByIdAndDelete(id);

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting file' });
    }
});

// GET /api/files/:id/download - Public/Admin: Download file
router.get('/:id/download', async (req, res) => {
    const { id } = req.params;

    try {
        const targetFile = await File.findById(id);

        if (!targetFile) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check if CLOSED
        if (targetFile.status === 'CLOSED') {
            const authHeader = req.query.token || req.headers.authorization;
            let token = null;

            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            } else if (req.query.token) {
                token = req.query.token;
            }

            if (!token) {
                return res.status(403).json({ message: 'Forbidden: File is closed' });
            }

            try {
                const jwt = require('jsonwebtoken');
                jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
                return res.status(403).json({ message: 'Forbidden: File is closed or invalid token' });
            }
        }

        // Redirect to Cloudinary URL for download
        // We use proxying to trigger a download window instead of viewing raw text on browser
        try {
            const response = await axios({
                method: 'get',
                url: targetFile.fileUrl,
                responseType: 'stream'
            });

            res.setHeader('Content-Type', response.headers['content-type']);
            res.setHeader('Content-Disposition', `attachment; filename="${targetFile.originalName}"`);
            res.setHeader('Content-Length', targetFile.size);

            response.data.pipe(res);
        } catch (streamError) {
            console.error("Stream Proxy Error:", streamError);
            res.redirect(targetFile.fileUrl); // Fallback to direct URL if stream fails
        }
    } catch (error) {
        res.status(500).json({ message: 'Database error fetching file' });
    }
});

module.exports = router;

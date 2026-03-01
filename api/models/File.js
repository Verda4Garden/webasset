const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    description: { type: String, default: '' },
    size: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' }
});

module.exports = mongoose.model('File', fileSchema);

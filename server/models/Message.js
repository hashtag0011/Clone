const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: { type: String },
    sender: { type: String },
    text: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, enum: ['text', 'image', 'video', 'file'], default: 'text' },
    replyTo: {
        _id: { type: String, default: null },
        text: { type: String, default: null },
        sender: { type: String, default: null },
        senderName: { type: String, default: null },
    },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    deletedFor: [{ type: String }],
    deletedForEveryone: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);

const router = require("express").Router();
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// Send message
router.post("/", async (req, res) => {
    const newMessage = new Message(req.body);
    try {
        const savedMessage = await newMessage.save();

        if (req.body.conversationId) {
            await Conversation.findByIdAndUpdate(req.body.conversationId, {
                $set: { updatedAt: new Date() },
            });
        }

        res.status(200).json(savedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get messages by conversation
router.get("/:conversationId", async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId,
            deletedForEveryone: { $ne: true },
        }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mark messages as read
router.put("/read/:conversationId/:userId", async (req, res) => {
    try {
        await Message.updateMany(
            {
                conversationId: req.params.conversationId,
                sender: { $ne: req.params.userId },
                status: { $ne: "read" },
            },
            { $set: { status: "read" } }
        );
        res.status(200).json("Messages marked as read");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete message
router.put("/delete/:messageId", async (req, res) => {
    const { userId, deleteForEveryone } = req.body;
    try {
        if (deleteForEveryone) {
            await Message.findByIdAndUpdate(req.params.messageId, {
                $set: { deletedForEveryone: true, text: "🚫 This message was deleted" },
            });
        } else {
            await Message.findByIdAndUpdate(req.params.messageId, {
                $push: { deletedFor: userId },
            });
        }
        res.status(200).json("Message deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;

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

// Get call history for a user (MUST be before /:conversationId to avoid matching "calls" as a conversationId)
router.get("/calls/:userId", async (req, res) => {
    try {
        // Find conversations the user is part of
        const conversations = await Conversation.find({
            members: { $in: [req.params.userId] },
        });
        const conversationIds = conversations.map((c) => c._id);

        // Find call messages in those conversations
        const calls = await Message.find({
            conversationId: { $in: conversationIds },
            fileType: "call",
        }).sort({ createdAt: -1 });

        res.status(200).json(calls);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mark messages as read (MUST be before /:conversationId)
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

// Delete message (MUST be before /:conversationId)
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

// Get messages by conversation (LAST - catch-all for GET /:id)
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

module.exports = router;

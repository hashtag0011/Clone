const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Create new conversation
router.post("/", async (req, res) => {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) return res.status(400).json("Missing participants");

    try {
        const existingConversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] },
        });
        if (existingConversation) return res.status(200).json(existingConversation);

        const newConversation = new Conversation({
            members: [senderId, receiverId],
        });
        const savedConversation = await newConversation.save();
        res.status(200).json(savedConversation);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get conversations of user with last message and unread count
router.get("/:userId", async (req, res) => {
    try {
        const conversations = await Conversation.find({
            members: { $in: [req.params.userId] },
        }).sort({ updatedAt: -1 });

        const conversationsWithMeta = await Promise.all(
            conversations.map(async (conv) => {
                const lastMessage = await Message.findOne({
                    conversationId: conv._id.toString(),
                    deletedForEveryone: { $ne: true },
                }).sort({ createdAt: -1 });

                const unreadCount = await Message.countDocuments({
                    conversationId: conv._id.toString(),
                    sender: { $ne: req.params.userId },
                    status: { $ne: "read" },
                });

                return {
                    ...conv._doc,
                    lastMessage: lastMessage || null,
                    unreadCount,
                };
            })
        );

        res.status(200).json(conversationsWithMeta);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get conversation between two users
router.get("/find/:firstUserId/:secondUserId", async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            members: { $all: [req.params.firstUserId, req.params.secondUserId] },
        });
        res.status(200).json(conversation);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;

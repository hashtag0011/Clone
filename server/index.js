const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

const authRoute = require("./routes/auth");
const userRoute = require("./routes/users");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");
const uploadRoute = require("./routes/upload");
const User = require("./models/User");
const Message = require("./models/Message");

dotenv.config();

mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(morgan("common"));
app.use(cors());
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/upload", uploadRoute);

const server = app.listen(process.env.PORT || 5000, () => {
    console.log("Backend server is running on port " + (process.env.PORT || 5000));
});

// Socket.io
const io = require("socket.io")(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
    },
});

let users = [];

const addUser = (userId, socketId) => {
    const existing = users.find((u) => u.userId === userId);
    if (existing) {
        existing.socketId = socketId;
    } else {
        users.push({ userId, socketId });
    }
};

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("addUser", async (userId) => {
        // Prevent simultaneous logins: disconnect existing session for same user
        const existing = getUser(userId);
        if (existing && existing.socketId !== socket.id) {
            // Notify the old session it has been displaced
            io.to(existing.socketId).emit("duplicateLogin");
            // Remove old user entry
            removeUser(existing.socketId);
        }

        addUser(userId, socket.id);
        io.emit("getUsers", users);
        try {
            await User.findByIdAndUpdate(userId, { status: "online" });
        } catch (err) { console.error(err); }
    });

    socket.on("sendMessage", async ({ senderId, receiverId, text, fileUrl, fileType, conversationId, _id, createdAt, replyTo, senderName }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("getMessage", {
                _id,
                senderId,
                senderName,
                text,
                fileUrl,
                fileType,
                conversationId,
                createdAt,
                replyTo,
                status: "delivered",
            });
            try {
                if (_id) {
                    await Message.findByIdAndUpdate(_id, { status: "delivered" });
                }
            } catch (err) { console.error(err); }
        }
    });

    socket.on("typing", ({ senderId, receiverId }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("userTyping", { senderId });
        }
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("userStopTyping", { senderId });
        }
    });

    socket.on("markAsRead", ({ conversationId, senderId, receiverId }) => {
        const user = getUser(senderId);
        if (user) {
            io.to(user.socketId).emit("messagesRead", { conversationId, readBy: receiverId });
        }
    });

    socket.on("deleteMessage", ({ messageId, receiverId, conversationId }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("messageDeleted", { messageId, conversationId });
        }
    });

    // Call signaling events
    socket.on("callUser", ({ senderId, receiverId, callType, senderName, signalData }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("incomingCall", {
                senderId,
                senderName,
                callType,
                signal: signalData,
            });
        }
    });

    socket.on("callAccepted", ({ senderId, receiverId, signal }) => {
        const user = getUser(senderId);
        if (user) {
            io.to(user.socketId).emit("callAccepted", { receiverId, signal });
        }
    });

    socket.on("callRejected", ({ senderId, receiverId }) => {
        const user = getUser(senderId);
        if (user) {
            io.to(user.socketId).emit("callRejected", { receiverId });
        }
    });

    socket.on("callSignal", ({ senderId, receiverId, signal }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("callSignal", { senderId, signal });
        }
    });

    socket.on("endCall", ({ senderId, receiverId }) => {
        const user = getUser(receiverId);
        if (user) {
            io.to(user.socketId).emit("callEnded", { senderId });
        }
    });

    socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);
        const user = users.find((u) => u.socketId === socket.id);
        if (user) {
            removeUser(socket.id);
            io.emit("getUsers", users);
            try {
                await User.findByIdAndUpdate(user.userId, { status: "offline", lastSeen: Date.now() });
            } catch (err) { console.error(err); }
        }
    });
});

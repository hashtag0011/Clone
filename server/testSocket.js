const io = require("socket.io-client");

// Connect user 1
const caller = io("http://localhost:5000", { transports: ["websocket"] });
// Connect user 2
const receiver = io("http://localhost:5000", { transports: ["websocket"] });

caller.on("connect", () => {
    console.log("Caller connected", caller.id);
    caller.emit("addUser", "callertest123");
});

receiver.on("connect", () => {
    console.log("Receiver connected", receiver.id);
    receiver.emit("addUser", "receivertest123");
});

receiver.on("incomingCall", (data) => {
    console.log("SUCCESS! Receiver got incomingCall:", data);
    process.exit(0);
});

caller.on("callUser", () => { /* never triggered by server, caller only emits */ });

setTimeout(() => {
    console.log("Caller emitting callUser to receiver...");
    caller.emit("callUser", {
        senderId: "callertest123",
        receiverId: "receivertest123",
        callType: "video",
        senderName: "Caller Test",
        signalData: "dummy_sdp"
    });
}, 2000);

setTimeout(() => {
    console.error("FAIL! Receiver did not get incomingCall event in time");
    process.exit(1);
}, 5000);

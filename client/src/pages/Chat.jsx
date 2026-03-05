
import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Sidebar from "../components/Sidebar";
import Welcome from "../components/Welcome";
import ChatContainer from "../components/ChatContainer";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import playSound, { playRingtone, stopRingtone } from "../utils/sounds";
import { BsTelephone, BsCameraVideo, BsTelephoneX } from "react-icons/bs";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Chat() {
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [incomingCall, setIncomingCall] = useState(null);
    const [callActive, setCallActive] = useState(null);

    // Load current user
    useEffect(() => {
        const stored = localStorage.getItem("chat-app-user");
        if (!stored) { navigate("/login"); return; }
        try {
            const user = JSON.parse(stored);
            if (!user || !user._id) throw new Error("Invalid user data");
            setCurrentUser(user);
        } catch (err) {
            console.error("Failed to parse user data:", err);
            localStorage.removeItem("chat-app-user");
            navigate("/login");
        }
    }, [navigate]);

    // Setup socket
    useEffect(() => {
        if (!currentUser) return;
        const newSocket = io(API, { transports: ["websocket"], upgrade: false });
        setSocket(newSocket);

        newSocket.on("connect", () => {
            newSocket.emit("addUser", currentUser._id);
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };
    }, [currentUser]);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;

        const handleGetUsers = (users) => setOnlineUsers(users);
        const handleTyping = ({ senderId }) => setTypingUsers((prev) => prev.includes(senderId) ? prev : [...prev, senderId]);
        const handleStopTyping = ({ senderId }) => setTypingUsers((prev) => prev.filter((id) => id !== senderId));

        const handleIncomingCall = (data) => {
            if (callActive) {
                // Already in a call — auto-reject
                socket.emit("callRejected", { senderId: data.senderId, receiverId: currentUser._id });
                return;
            }
            setIncomingCall(data);
            playRingtone();
        };

        // When the person we called REJECTED our call
        const handleCallRejected = () => {
            setCallActive(null);
            setIncomingCall(null);
            stopRingtone();
            toast.info("📵 Call declined", { position: "top-center", autoClose: 3000 });
        };

        // callEnded is handled inside ChatContainer for active calls.
        // We only handle it here to clean up ringtone / pending incoming state.
        const handleCallEndedGlobal = () => {
            stopRingtone();
            setIncomingCall(null);
        };

        // Another device/tab logged in with same account
        const handleDuplicateLogin = () => {
            toast.error("⚠️ Your account was logged in from another device. You have been signed out.", {
                position: "top-center", autoClose: 5000
            });
            setTimeout(() => {
                localStorage.removeItem("chat-app-user");
                navigate("/login");
            }, 3000);
        };

        socket.on("getUsers", handleGetUsers);
        socket.on("userTyping", handleTyping);
        socket.on("userStopTyping", handleStopTyping);
        socket.on("incomingCall", handleIncomingCall);
        socket.on("callRejected", handleCallRejected);
        socket.on("callEnded", handleCallEndedGlobal);
        socket.on("duplicateLogin", handleDuplicateLogin);

        return () => {
            socket.off("getUsers", handleGetUsers);
            socket.off("userTyping", handleTyping);
            socket.off("userStopTyping", handleStopTyping);
            socket.off("incomingCall", handleIncomingCall);
            socket.off("callRejected", handleCallRejected);
            socket.off("callEnded", handleCallEndedGlobal);
            socket.off("duplicateLogin", handleDuplicateLogin);
        };
    }, [socket, callActive, currentUser, navigate, contacts]);

    // Load contacts
    useEffect(() => {
        if (!currentUser) return;
        axios.get(`${API}/api/users`).then((res) => {
            const data = Array.isArray(res.data) ? res.data : [];
            setContacts(data.filter((u) => u._id !== currentUser._id));
        }).catch((err) => {
            console.error("Failed to load contacts:", err);
            setContacts([]);
        });
    }, [currentUser]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        if (!currentUser) return;
        try {
            const res = await axios.get(`${API}/api/conversations/${currentUser._id}`);
            if (Array.isArray(res.data)) {
                setConversations(res.data);
            } else {
                setConversations([]);
            }
        } catch (err) {
            console.error("Failed to load conversations:", err);
            setConversations([]);
        }
    }, [currentUser]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // Global notification for incoming messages
    useEffect(() => {
        if (!socket || !currentUser) return;

        const handler = (data) => {
            if (data.fileType === "call") return; // Handled by incomingCall event mostly, but also as msg

            // Refresh conversation list logic
            loadConversations();

            // Should play sound?
            if (currentChat && data.senderId === currentChat._id) {
                return;
            }

            // Not in chat: Notification
            const sender = contacts.find(c => c._id === data.senderId);
            const senderName = data.senderName || sender?.username || "Someone";

            playSound("receive");

            if ("Notification" in window && Notification.permission === "granted") {
                const notif = new Notification(`New message from ${senderName}`, {
                    body: data.text || "New message",
                    icon: sender?.avatarImage ? `${API}/images/${sender.avatarImage}` : undefined,
                });
                notif.onclick = () => { window.focus(); if (sender) setCurrentChat(sender); };
            }

            // Only show one toast (update existing if multiple messages arrive fast)
            toast(
                <div onClick={() => { if (sender) setCurrentChat(sender); }} className="cursor-pointer">
                    <p className="font-bold text-sm">{senderName}</p>
                    <p className="text-xs truncate">{data.text || "Sent a file"}</p>
                </div>,
                { toastId: "new-message-toast", position: "top-right", autoClose: 4000, theme: "light" }
            );
        };

        socket.on("getMessage", handler);
        return () => { socket.off("getMessage", handler); };
    }, [socket, currentChat, contacts, currentUser, loadConversations]);

    // Request notification permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    const handleChatChange = (contact) => {
        setCurrentChat(contact);
    };

    const handleLogout = () => {
        localStorage.removeItem("chat-app-user");
        if (socket) socket.disconnect();
        navigate("/login");
    };

    const acceptCall = () => {
        if (!incomingCall) return;
        stopRingtone();
        const caller = contacts.find(c => c._id === incomingCall.senderId);
        if (caller) setCurrentChat(caller);

        setCallActive({
            type: incomingCall.callType,
            direction: 'incoming',
            callerId: incomingCall.senderId,
            signal: incomingCall.signal
        });

        setIncomingCall(null);
    };

    const rejectCall = () => {
        if (!incomingCall) return;
        stopRingtone();
        if (socket) socket.emit("callRejected", { senderId: incomingCall.senderId, receiverId: currentUser._id });
        setIncomingCall(null);
    };

    return (
        <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center p-0 lg:p-6 font-sans">
            <div className="liquid-bg"></div>
            <ToastContainer position="top-right" autoClose={5000} theme="light" />

            {/* ───── Incoming Call Full-Screen Alert ───── */}
            {incomingCall && (
                <div
                    className="fixed inset-0 flex items-center justify-center animate-fade-in"
                    style={{ zIndex: 99999, background: "rgba(0,0,0,0.85)" }}
                >
                    {/* Blurred background avatar */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <img
                            src={contacts.find(c => c._id === incomingCall.senderId)?.avatarImage
                                ? `${API}/images/${contacts.find(c => c._id === incomingCall.senderId).avatarImage}`
                                : `https://ui-avatars.com/api/?name=${incomingCall.senderName}&background=2563eb&color=fff&size=200`}
                            className="w-full h-full object-cover opacity-10 blur-3xl scale-110"
                            alt=""
                        />
                    </div>

                    <div className="relative flex flex-col items-center gap-6 px-8 py-10 w-[340px] max-w-full">
                        {/* Pulsing avatar */}
                        <div className="relative">
                            <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" style={{ animationDuration: "1.5s" }} />
                            <span className="absolute -inset-4 rounded-full border-2 border-white/15 animate-pulse" />
                            <img
                                src={contacts.find(c => c._id === incomingCall.senderId)?.avatarImage
                                    ? `${API}/images/${contacts.find(c => c._id === incomingCall.senderId).avatarImage}`
                                    : `https://ui-avatars.com/api/?name=${incomingCall.senderName}&background=2563eb&color=fff&size=200`}
                                alt=""
                                className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-2xl relative z-10"
                            />
                        </div>

                        {/* Caller info */}
                        <div className="text-center">
                            <p className="text-white/60 text-sm font-medium tracking-widest uppercase mb-1">Incoming {incomingCall.callType} call</p>
                            <h2 className="text-white text-3xl font-extrabold tracking-tight drop-shadow-lg">{incomingCall.senderName}</h2>
                            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${incomingCall.callType === "video"
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}>
                                {incomingCall.callType === "video" ? <BsCameraVideo /> : <BsTelephone />}
                                {incomingCall.callType === "video" ? "Video Call" : "Audio Call"}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-10 mt-4">
                            {/* Decline */}
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={rejectCall}
                                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-red-500/40 transition-all"
                                >
                                    <BsTelephoneX className="text-2xl" />
                                </button>
                                <span className="text-white/50 text-xs">Decline</span>
                            </div>

                            {/* Accept */}
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={acceptCall}
                                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-green-500/40 transition-all animate-bounce"
                                >
                                    {incomingCall.callType === "video" ? <BsCameraVideo className="text-2xl" /> : <BsTelephone className="text-2xl" />}
                                </button>
                                <span className="text-white/50 text-xs">Accept</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full h-full lg:max-w-[1240px] lg:h-[90vh] flex overflow-hidden lg:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] glass-panel z-10 relative">
                <Sidebar
                    contacts={contacts}
                    conversations={conversations}
                    currentUser={currentUser}
                    onlineUsers={onlineUsers}
                    typingUsers={typingUsers}
                    currentChat={currentChat}
                    changeChat={handleChatChange}
                    onLogout={handleLogout}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    updateCurrentUser={setCurrentUser}
                />
                <div className="flex-1 flex flex-col relative bg-transparent">
                    {currentChat ? (
                        <ChatContainer
                            currentChat={currentChat}
                            currentUser={currentUser}
                            socket={socket}
                            onlineUsers={onlineUsers}
                            typingUsers={typingUsers}
                            refreshConversations={loadConversations}
                            onBack={() => setCurrentChat(null)}
                            callActiveProp={callActive}
                            setCallActiveProp={setCallActive}
                        />
                    ) : (
                        <Welcome currentUser={currentUser || { username: "User" }} />
                    )}
                </div>
            </div>
        </div>
    );
}

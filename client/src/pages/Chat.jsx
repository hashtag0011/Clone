
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
import { BsTelephone, BsCameraVideo, BsTelephoneX, BsMicFill } from "react-icons/bs";

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

    // Use refs to keep latest state accessible inside socket callbacks without re-registering
    const callActiveRef = useRef(callActive);
    const currentUserRef = useRef(currentUser);
    useEffect(() => { callActiveRef.current = callActive; }, [callActive]);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

    // ── Load current user ──────────────────────────────────────────────────────
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

    // ── Setup socket (runs once per user) ─────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;

        // Unlock AudioContext on FIRST user interaction (browsers require this)
        const unlockAudio = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                ctx.resume().then(() => ctx.close());
            } catch (e) { }
        };
        document.addEventListener("click", unlockAudio, { capture: true, once: true });
        document.addEventListener("touchstart", unlockAudio, { capture: true, once: true });

        const newSocket = io(API, {
            transports: ["websocket"],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });
        setSocket(newSocket);

        newSocket.on("connect", () => {
            console.log("✅ Socket connected:", newSocket.id);
            newSocket.emit("addUser", currentUser._id);
        });

        newSocket.on("disconnect", (reason) => {
            console.warn("⚠️ Socket disconnected:", reason);
        });

        // ── CALL EVENTS — registered once, use refs for latest state ──
        newSocket.on("incomingCall", (data) => {
            console.log("📞 incomingCall received:", data);
            if (callActiveRef.current) {
                // Already in a call — auto-reject
                newSocket.emit("callRejected", {
                    senderId: data.senderId,
                    receiverId: currentUserRef.current._id
                });
                return;
            }
            setIncomingCall(data);
            playRingtone();
        });

        newSocket.on("callRejected", () => {
            setCallActive(null);
            setIncomingCall(null);
            stopRingtone();
            toast.info("📵 Call declined", { position: "top-center", autoClose: 3000 });
        });

        newSocket.on("callEnded", () => {
            stopRingtone();
            setIncomingCall(null);
        });

        newSocket.on("duplicateLogin", () => {
            toast.error("⚠️ Your account was logged in from another device. You have been signed out.", {
                position: "top-center", autoClose: 5000
            });
            setTimeout(() => {
                localStorage.removeItem("chat-app-user");
                navigate("/login");
            }, 3000);
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };
    }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Online / Typing listeners ──────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handleGetUsers = (users) => setOnlineUsers(users);
        const handleTyping = ({ senderId }) => setTypingUsers(prev => prev.includes(senderId) ? prev : [...prev, senderId]);
        const handleStopTyping = ({ senderId }) => setTypingUsers(prev => prev.filter(id => id !== senderId));
        socket.on("getUsers", handleGetUsers);
        socket.on("userTyping", handleTyping);
        socket.on("userStopTyping", handleStopTyping);
        return () => {
            socket.off("getUsers", handleGetUsers);
            socket.off("userTyping", handleTyping);
            socket.off("userStopTyping", handleStopTyping);
        };
    }, [socket]);

    // ── Load contacts ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;
        axios.get(`${API}/api/users`).then(res => {
            const data = Array.isArray(res.data) ? res.data : [];
            setContacts(data.filter(u => u._id !== currentUser._id));
        }).catch(err => {
            console.error("Failed to load contacts:", err);
            setContacts([]);
        });
    }, [currentUser]);

    // ── Load conversations ────────────────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!currentUser) return;
        try {
            const res = await axios.get(`${API}/api/conversations/${currentUser._id}`);
            setConversations(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to load conversations:", err);
            setConversations([]);
        }
    }, [currentUser]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // ── Global new-message notifications ──────────────────────────────────────
    const currentChatRef = useRef(currentChat);
    const contactsRef = useRef(contacts);
    useEffect(() => { currentChatRef.current = currentChat; }, [currentChat]);
    useEffect(() => { contactsRef.current = contacts; }, [contacts]);

    useEffect(() => {
        if (!socket || !currentUser) return;
        const handler = (data) => {
            if (data.fileType === "call") return;
            loadConversations();

            // Don't show if already looking at this chat
            if (currentChatRef.current && data.senderId === currentChatRef.current._id) return;

            const sender = contactsRef.current.find(c => c._id === data.senderId);
            const senderName = data.senderName || sender?.username || "Someone";

            // Play receive sound
            playSound("receive");

            // Browser notification
            if ("Notification" in window && Notification.permission === "granted") {
                const notif = new Notification(`💬 ${senderName}`, {
                    body: data.text || "Sent a file",
                    icon: sender?.avatarImage ? `${API}/images/${sender.avatarImage}` : undefined,
                });
                notif.onclick = () => { window.focus(); if (sender) setCurrentChat(sender); };
            }

            // In-app toast (single, replacing)
            toast(
                <div onClick={() => { if (sender) setCurrentChat(sender); }} className="cursor-pointer flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                        {senderName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{senderName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.text || "Sent a file"}</p>
                    </div>
                </div>,
                {
                    toastId: `msg-${data.senderId}`,
                    position: "top-right",
                    autoClose: 4000,
                    style: { background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px 16px" },
                }
            );
        };
        socket.on("getMessage", handler);
        return () => { socket.off("getMessage", handler); };
    }, [socket, currentUser, loadConversations]);

    // ── Request notification permission ──────────────────────────────────────
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    const handleChatChange = (contact) => { setCurrentChat(contact); };

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

    const caller = incomingCall ? contacts.find(c => c._id === incomingCall.senderId) : null;
    const callerAvatar = caller?.avatarImage
        ? `${API}/images/${caller.avatarImage}`
        : `https://ui-avatars.com/api/?name=${incomingCall?.senderName || "?"}&background=4f46e5&color=fff&size=200`;

    return (
        <div className="h-screen w-screen relative overflow-hidden flex items-center justify-center p-0 lg:p-6 font-sans">
            <div className="liquid-bg" />
            <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop />

            {/* ═══ Incoming Call Full-Screen Dialog ═══ */}
            {incomingCall && (
                <div
                    className="fixed inset-0 flex items-end sm:items-center justify-center"
                    style={{ zIndex: 99999, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
                >
                    {/* Animated gradient bg */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ background: "radial-gradient(circle at 50% 40%, #4f46e5 0%, transparent 70%)" }}
                    />

                    <div className="relative w-full max-w-sm mx-4 mb-8 sm:mb-0 flex flex-col items-center gap-6 animate-slide-up">

                        {/* Caller avatar with pulsing rings */}
                        <div className="relative flex items-center justify-center">
                            <span className="absolute w-44 h-44 rounded-full border border-indigo-400/20 animate-ping" style={{ animationDuration: "2s" }} />
                            <span className="absolute w-36 h-36 rounded-full border border-indigo-400/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
                            <img
                                src={callerAvatar}
                                alt={incomingCall.senderName}
                                className="w-28 h-28 rounded-full object-cover border-4 border-indigo-500/60 shadow-2xl shadow-indigo-500/30 relative z-10"
                            />
                            {/* Call type badge */}
                            <div className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center z-20 shadow-lg border-2 border-black/30 ${incomingCall.callType === "video" ? "bg-blue-500" : "bg-emerald-500"}`}>
                                {incomingCall.callType === "video"
                                    ? <BsCameraVideo className="text-white text-sm" />
                                    : <BsMicFill className="text-white text-sm" />}
                            </div>
                        </div>

                        {/* Caller info */}
                        <div className="text-center">
                            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-[0.2em] mb-2">
                                Incoming {incomingCall.callType} call
                            </p>
                            <h2 className="text-white text-4xl font-black tracking-tight">{incomingCall.senderName}</h2>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-16 mt-2">
                            {/* Decline */}
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    onClick={rejectCall}
                                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition-all duration-200"
                                >
                                    <BsTelephoneX className="text-2xl" />
                                </button>
                                <span className="text-zinc-400 text-xs font-medium">Decline</span>
                            </div>

                            {/* Accept */}
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    onClick={acceptCall}
                                    className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90"
                                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 0 30px rgba(34,197,94,0.5)" }}
                                >
                                    {incomingCall.callType === "video"
                                        ? <BsCameraVideo className="text-2xl" />
                                        : <BsTelephone className="text-2xl" />}
                                </button>
                                <span className="text-zinc-400 text-xs font-medium">Accept</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Main Chat Layout ═══ */}
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


import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatInput from "./ChatInput";
import axios from "axios";
import { BsArrowLeft, BsThreeDotsVertical, BsTrash, BsReply, BsTelephone, BsCameraVideo, BsInfoCircle, BsPlayFill, BsPauseFill, BsX, BsMicMute, BsCameraVideoOff } from "react-icons/bs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import playSound from "../utils/sounds";

const API = "http://localhost:5000";

export default function ChatContainer({ currentChat, currentUser, socket, onlineUsers, typingUsers, refreshConversations }) {
    const [messages, setMessages] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [viewingMedia, setViewingMedia] = useState(null);
    const [inCall, setInCall] = useState(false);
    const [localStream, setLocalStream] = useState(null);

    const scrollRef = useRef();
    const messagesEndRef = useRef();
    const videoRef = useRef();

    const isOnline = onlineUsers.some((u) => u.userId === currentChat._id);
    const isTyping = typingUsers.includes(currentChat._id);

    const getAvatarUrl = (user) => {
        if (user.avatarImage) {
            return `${API}/images/${user.avatarImage}`;
        }
        return `https://api.multiavatar.com/${user.username}.png`;
    };

    // Fetch conversation data
    useEffect(() => {
        const fetchData = async () => {
            if (!currentChat || !currentUser) return;
            try {
                const res = await axios.get(`${API}/api/conversations/find/${currentUser._id}/${currentChat._id}`);
                setConversation(res.data);
                if (res.data) {
                    const msgs = await axios.get(`${API}/api/messages/${res.data._id}`);
                    const filtered = msgs.data.filter(m => !(m.deletedFor || []).includes(currentUser._id));
                    setMessages(filtered);
                    await axios.put(`${API}/api/messages/read/${res.data._id}/${currentUser._id}`);
                    if (socket.current) {
                        const otherMember = res.data.members.find(m => m !== currentUser._id);
                        socket.current.emit("markAsRead", {
                            conversationId: res.data._id,
                            senderId: otherMember,
                            receiverId: currentUser._id,
                        });
                    }
                    refreshConversations();
                } else {
                    setMessages([]);
                }
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, [currentChat, currentUser]);

    // Socket listeners
    useEffect(() => {
        if (!socket.current) return;
        const handler = (data) => {
            if (currentChat && data.senderId === currentChat._id) {
                setMessages((prev) => [...prev, { ...data, status: "delivered" }]);
                playSound("receive");
                toast.info(`New message from ${currentChat.username}`, { position: "top-right", autoClose: 3000, theme: "dark" });

                if (conversation) {
                    axios.put(`${API}/api/messages/read/${conversation._id}/${currentUser._id}`).catch(console.error);
                    socket.current.emit("markAsRead", {
                        conversationId: conversation._id,
                        senderId: currentChat._id,
                        receiverId: currentUser._id,
                    });
                }
            }
        };
        socket.current.on("getMessage", handler);
        return () => { if (socket.current) socket.current.off("getMessage", handler); };
    }, [socket, currentChat, conversation]);

    // Read receipts & deletion
    useEffect(() => {
        if (!socket.current) return;
        const readHandler = ({ conversationId }) => {
            if (conversation && conversationId === conversation._id) {
                setMessages((prev) => prev.map((m) => m.sender === currentUser._id ? { ...m, status: "read" } : m));
            }
        };
        const deleteHandler = ({ messageId }) => {
            setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, text: "🚫 This message was deleted", deletedForEveryone: true, fileUrl: "" } : m));
        };
        socket.current.on("messagesRead", readHandler);
        socket.current.on("messageDeleted", deleteHandler);
        return () => {
            socket.current.off("messagesRead", readHandler);
            socket.current.off("messageDeleted", deleteHandler);
        };
    }, [socket, conversation]);

    // Auto-scroll
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // Close context menu
    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener("click", handler);
        return () => window.removeEventListener("click", handler);
    }, []);

    const handleSendMsg = async ({ text, fileUrl, fileType }) => {
        let convId = conversation?._id;
        if (!convId) {
            try {
                const res = await axios.post(`${API}/api/conversations/`, { senderId: currentUser._id, receiverId: currentChat._id });
                setConversation(res.data);
                convId = res.data._id;
            } catch (err) { console.error(err); return; }
        }
        try {
            const msgData = {
                conversationId: convId, sender: currentUser._id, text, fileUrl, fileType,
                replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender, senderName: replyTo.sender === currentUser._id ? currentUser.username : currentChat.username } : null,
            };
            const res = await axios.post(`${API}/api/messages`, msgData);
            setMessages((prev) => [...prev, res.data]);
            socket.current.emit("sendMessage", { ...res.data, receiverId: currentChat._id, senderName: currentUser.username });
            playSound("send"); // Play send sound
            setReplyTo(null);
            refreshConversations();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (msg, forEveryone) => {
        try {
            await axios.put(`${API}/api/messages/delete/${msg._id}`, { userId: currentUser._id, deleteForEveryone: forEveryone });
            if (forEveryone) {
                setMessages((prev) => prev.map((m) => m._id === msg._id ? { ...m, text: "🚫 Deleted", deletedForEveryone: true, fileUrl: "" } : m));
                socket.current.emit("deleteMessage", { messageId: msg._id, receiverId: conversation.members.find(m => m !== currentUser._id), conversationId: conversation._id });
            } else {
                setMessages((prev) => prev.filter((m) => m._id !== msg._id));
            }
            setContextMenu(null);
        } catch (err) { console.error(err); }
    };

    // Video Call Handlers
    const startCall = async () => {
        setInCall(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
            setLocalStream(stream);
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera/microphone");
            setInCall(false);
        }
    };

    const endCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setInCall(false);
    };

    useEffect(() => {
        if (inCall && videoRef.current && localStream) videoRef.current.srcObject = localStream;
    }, [inCall, localStream]);

    // Helper to open media
    const openMedia = (url) => setViewingMedia(url);

    const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const getDateKey = (d) => new Date(d).toDateString();
    let lastDateKey = null;

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden backdrop-blur-3xl bg-black/40">
            {/* Liquid Background */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-ios-primary/20 rounded-full blur-3xl animate-pulse-slow pointer-events-none z-0"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-ios-secondary/20 rounded-full blur-3xl animate-pulse-slow pointer-events-none delay-1000 z-0"></div>

            <ToastContainer />

            {/* Absolute Header - Ensuring visibility with Z-50 */}
            <div className="absolute top-0 left-0 right-0 z-50 h-20 px-6 flex items-center justify-between bg-ios-glass-card backdrop-blur-xl border-b border-white/10 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img
                            src={getAvatarUrl(currentChat)}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm bg-white/5"
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${currentChat.username}&background=0D8ABC&color=fff`; }}
                        />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${isOnline ? 'bg-ios-success shadow-[0_0_8px_rgba(52,199,89,0.8)]' : 'bg-ios-text-secondary'}`}></span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-[16px] leading-tight tracking-wide drop-shadow-sm">{currentChat.username}</h3>
                        <p className="text-ios-primary text-[11px] font-medium tracking-wider uppercase opacity-90">
                            {isTyping ? "typing..." : isOnline ? "Online" : "Last seen recently"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-ios-primary text-xl">
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><BsTelephone /></button>
                    <button onClick={startCall} className="p-2 hover:bg-white/10 rounded-full transition-colors"><BsCameraVideo /></button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><BsInfoCircle /></button>
                </div>
            </div>

            {/* Messages Area with Padding-Top to clear Header */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 pt-24 custom-scrollbar space-y-3 z-10" ref={scrollRef}>
                {messages.map((msg, i) => {
                    const isMine = msg.sender === currentUser._id;
                    const dateKey = getDateKey(msg.createdAt);
                    let showDate = false;
                    if (dateKey !== lastDateKey) { showDate = true; lastDateKey = dateKey; }

                    return (
                        <React.Fragment key={msg._id || i}>
                            {showDate && (
                                <div className="flex justify-center my-6">
                                    <span className="bg-black/30 backdrop-blur-md text-ios-text-secondary text-[10px] font-medium px-3 py-1 rounded-full uppercase tracking-widest border border-white/5 shadow-sm">
                                        {new Date(msg.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            )}

                            <div className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2 group animate-scale-in`}>
                                {/* Avatar for other user */}
                                {!isMine && (
                                    <img
                                        src={getAvatarUrl(currentChat)}
                                        className="w-8 h-8 rounded-full object-cover mb-1 border border-white/10 bg-black/20"
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${currentChat.username}&background=0D8ABC&color=fff`; }}
                                    />
                                )}

                                <div
                                    className={`relative max-w-[65%] px-4 py-3 rounded-2xl shadow-lg border border-white/5 backdrop-blur-md transition-transform duration-200 hover:scale-[1.01] ${isMine ? "bg-gradient-to-br from-ios-primary to-[#0063CC] text-white rounded-br-none" : "bg-white/10 text-white rounded-bl-none border-white/10"
                                        }`}
                                    onContextMenu={(e) => { e.preventDefault(); if (!msg.deletedForEveryone) setContextMenu({ x: e.clientX, y: e.clientY, msg }); }}
                                >
                                    {msg.replyTo && (
                                        <div className={`text-xs mb-2 border-l-2 pl-2 py-1 rounded ${isMine ? "bg-black/10 border-white/50" : "bg-white/5 border-ios-primary"}`}>
                                            <p className="font-semibold opacity-80">{msg.replyTo.senderName}</p>
                                            <p className="opacity-60 truncate">{msg.replyTo.text}</p>
                                        </div>
                                    )}

                                    {msg.fileUrl && !msg.deletedForEveryone ? (
                                        <div className="mb-2 cursor-pointer transition-opacity hover:opacity-90 min-h-[50px] min-w-[200px] bg-black/20 rounded flex items-center justify-center p-2 relative group-item">
                                            {msg.fileType === "image" ? (
                                                <img
                                                    src={`${API}/images/${msg.fileUrl}`}
                                                    alt="Media"
                                                    className="rounded-lg max-w-full max-h-[300px] object-cover shadow-md"
                                                    onClick={() => openMedia(`${API}/images/${msg.fileUrl}`)}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = `<span class="text-xs text-red-400">Failed to load image</span>`;
                                                    }}
                                                />
                                            ) : msg.fileType === "video" ? (
                                                <video src={`${API}/images/${msg.fileUrl}`} controls className="rounded-lg max-w-full shadow-md" />
                                            ) : msg.fileType === "audio" ? (
                                                <div className="w-full min-w-[250px] p-2 bg-black/40 rounded-lg border border-white/10">
                                                    <audio src={`${API}/images/${msg.fileUrl}`} controls className="w-full h-8" />
                                                </div>
                                            ) : (
                                                <a href={`${API}/images/${msg.fileUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-white/90">📎 Attachment</a>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[15px] leading-relaxed font-light tracking-wide">{msg.text}</p>
                                    )}

                                    <div className={`text-[9px] font-medium mt-1 flex items-center justify-end gap-1 opacity-70 ${isMine ? "text-white/80" : "text-ios-text-secondary"}`}>
                                        <span>{formatTime(msg.createdAt)}</span>
                                        {isMine && !msg.deletedForEveryone && (msg.status === "read" ? <span className="text-white font-bold">✓✓</span> : <span>✓</span>)}
                                    </div>
                                </div>

                                {/* Your Avatar */}
                                {isMine && (
                                    <img
                                        src={getAvatarUrl(currentUser)}
                                        className="w-8 h-8 rounded-full object-cover mb-1 border border-white/10 bg-black/20"
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }}
                                    />
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
                {isTyping && <div className="text-ios-text-secondary text-xs pl-4 animate-pulse">Typing...</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 w-full z-40 pb-4 px-4 pt-2 bg-gradient-to-t from-black via-black/80 to-transparent">
                {replyTo && (
                    <div className="px-6 py-2 bg-black/60 backdrop-blur-md border-t border-white/10 flex justify-between items-center animate-slide-up mb-2 rounded-t-xl">
                        <div className="text-sm">
                            <span className="text-ios-primary font-semibold">Replying to {replyTo.senderName}</span>
                            <p className="text-ios-text-secondary truncate text-xs">{replyTo.text}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-ios-text-secondary hover:text-white text-xl">&times;</button>
                    </div>
                )}
                <ChatInput handleSendMsg={handleSendMsg} onTyping={() => socket.current.emit("typing", { senderId: currentUser._id, receiverId: currentChat._id })} onStopTyping={() => socket.current.emit("stopTyping", { senderId: currentUser._id, receiverId: currentChat._id })} />
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed z-50 bg-ios-surface/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm flex items-center gap-3"><BsReply /> Reply</button>
                    {contextMenu.msg.sender === currentUser._id && <button onClick={() => handleDelete(contextMenu.msg, true)} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-ios-danger flex items-center gap-3"><BsTrash /> Delete</button>}
                </div>
            )}

            {/* Media Viewer Modal */}
            {viewingMedia && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-scale-in" onClick={() => setViewingMedia(null)}>
                    <img src={viewingMedia} alt="Full size" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
                    <button className="absolute top-4 right-4 text-white text-3xl p-2 hover:bg-white/10 rounded-full"><BsX /></button>
                </div>
            )}

            {/* Video Call Modal */}
            {inCall && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-scale-in">
                    <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm backdrop-blur-md flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> HD Video Call
                        </div>
                    </div>
                    <div className="mt-8 flex items-center gap-6">
                        <button className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><BsMicMute className="text-2xl" /></button>
                        <button className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><BsCameraVideoOff className="text-2xl" /></button>
                        <button onClick={endCall} className="p-4 bg-red-500 rounded-full text-white hover:bg-red-600 transition-all transform hover:scale-110 shadow-lg shadow-red-500/40"><BsTelephone className="text-3xl rotate-[135deg]" /></button>
                    </div>
                    <p className="mt-4 text-ios-text-secondary">Calling {currentChat.username}...</p>
                </div>
            )}
        </div>
    );
}

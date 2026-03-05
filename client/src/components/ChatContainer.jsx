
import React, { useState, useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import axios from "axios";
import { BsArrowLeft, BsThreeDots, BsTrash, BsReply, BsX, BsCheckLg, BsTelephone, BsCameraVideo, BsTelephoneX, BsMicMute, BsMic, BsCameraVideoOff } from "react-icons/bs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import playSound from "../utils/sounds";
import Peer from "simple-peer";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ChatContainer({ currentChat, currentUser, socket, onlineUsers, typingUsers, refreshConversations, onBack, callActiveProp: callActive, setCallActiveProp: setCallActive }) {
    const [messages, setMessages] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [viewingMedia, setViewingMedia] = useState(null);

    // callActive state is now lifted to Chat.jsx and passed via props

    const [callTimer, setCallTimer] = useState(0);
    const [callMuted, setCallMuted] = useState(false);
    const [callVideoOff, setCallVideoOff] = useState(false);
    const [callStatus, setCallStatus] = useState('');

    const scrollRef = useRef();
    const messagesEndRef = useRef();
    const callTimerRef = useRef(null);
    const myVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const connectionRef = useRef(null);

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
                    if (socket) {
                        const otherMember = res.data.members.find(m => m !== currentUser._id);
                        socket.emit("markAsRead", {
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
        if (!socket) return;
        const handler = (data) => {
            if (currentChat && data.senderId === currentChat._id) {
                setMessages((prev) => [...prev, { ...data, status: "delivered" }]);
                playSound("receive");

                if (conversation) {
                    axios.put(`${API}/api/messages/read/${conversation._id}/${currentUser._id}`).catch(console.error);
                    socket.emit("markAsRead", {
                        conversationId: conversation._id,
                        senderId: currentChat._id,
                        receiverId: currentUser._id,
                    });
                }
            }
        };
        socket.on("getMessage", handler);
        return () => { socket.off("getMessage", handler); };
    }, [socket, currentChat, conversation, currentUser]);

    // Read receipts & deletion
    useEffect(() => {
        if (!socket) return;
        const readHandler = ({ conversationId }) => {
            if (conversation && conversationId === conversation._id) {
                setMessages((prev) => prev.map((m) => m.sender === currentUser._id ? { ...m, status: "read" } : m));
            }
        };
        const deleteHandler = ({ messageId }) => {
            setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, text: "🚫 This message was deleted", deletedForEveryone: true, fileUrl: "" } : m));
        };
        socket.on("messagesRead", readHandler);
        socket.on("messageDeleted", deleteHandler);
        return () => {
            socket.off("messagesRead", readHandler);
            socket.off("messageDeleted", deleteHandler);
        };
    }, [socket, conversation, currentUser]);

    // Auto-scroll
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // Close context menu
    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener("click", handler);
        return () => window.removeEventListener("click", handler);
    }, []);

    // Media Controls
    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !callMuted;
            });
        }
    }, [callMuted]);

    useEffect(() => {
        if (localStreamRef.current && callActive?.type === 'video') {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !callVideoOff;
            });
        }
    }, [callVideoOff, callActive]);

    const startTimer = () => {
        setCallTimer(0);
        clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    };

    const endCallLocally = () => {
        clearInterval(callTimerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (connectionRef.current && !connectionRef.current.destroyed) {
            connectionRef.current.destroy();
            connectionRef.current = null;
        }
        if (myVideoRef.current) myVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

        setCallActive(null);
        setCallMuted(false);
        setCallVideoOff(false);
        setCallStatus('');
    };

    // callAccepted — register once per socket, use ref for peer
    const connectionRef_accepted = useRef(null);
    useEffect(() => {
        if (!socket) return;
        const handleCallAccepted = (signalData) => {
            setCallStatus('Connected');
            setCallActive(prev => prev ? { ...prev, answered: true } : prev);
            if (connectionRef.current && !connectionRef.current.destroyed) {
                connectionRef.current.signal(signalData.signal);
            }
            startTimer();
        };
        const handleCallEnded = () => {
            endCallLocally();
            toast.info("📵 Call ended", { position: "top-center", autoClose: 3000 });
        };
        const handleCallRejected = () => {
            endCallLocally();
            toast.info("📵 Call declined", { position: "top-center", autoClose: 3000 });
        };
        socket.on("callAccepted", handleCallAccepted);
        socket.on("callEnded", handleCallEnded);
        socket.on("callRejected", handleCallRejected);
        return () => {
            socket.off("callAccepted", handleCallAccepted);
            socket.off("callEnded", handleCallEnded);
            socket.off("callRejected", handleCallRejected);
        };
    }, [socket]);

    // Call Setup & Media Stream
    useEffect(() => {
        if (!callActive) return;

        // Auto hang-up if not answered after 60 seconds (outgoing only)
        let ringTimeout;
        if (!callActive.answered && callActive.direction === 'outgoing') {
            ringTimeout = setTimeout(() => {
                toast.error("Call not answered", { position: "top-center" });
                if (socket) {
                    socket.emit("endCall", { senderId: currentUser._id, receiverId: currentChat._id });
                }
                endCallLocally();
            }, 60000);
        }

        if (callActive.answered) return;

        let cancelled = false;
        const isVideo = callActive.type === 'video';

        const setupMedia = async () => {
            // HD audio + video constraints
            const audioConstraints = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000,
                channelCount: 1,
            };
            const videoConstraints = isVideo ? {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 30 },
                facingMode: "user",
            } : false;

            // Helper: try getUserMedia with fallback
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });
            } catch (videoErr) {
                if (isVideo) {
                    // Camera denied or unavailable — fallback to audio-only
                    console.warn("Camera access failed, falling back to audio-only:", videoErr.message);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
                        toast.warn("📷 Camera unavailable — continuing with audio only", { position: "top-center", autoClose: 4000 });
                    } catch (audioErr) {
                        console.error("Audio access also failed:", audioErr);
                        toast.error("🎤 Microphone access denied. Please allow microphone in browser settings.", { position: "top-center", autoClose: 5000 });
                        if (!cancelled) {
                            endCallLocally();
                            socket?.emit("endCall", { senderId: currentUser._id, receiverId: callActive.direction === 'incoming' ? callActive.callerId : currentChat._id });
                        }
                        return;
                    }
                } else {
                    // Audio-only call failed
                    console.error("Microphone access failed:", videoErr);
                    toast.error("🎤 Microphone access denied. Please allow microphone in browser settings.", { position: "top-center", autoClose: 5000 });
                    if (!cancelled) {
                        endCallLocally();
                        socket?.emit("endCall", { senderId: currentUser._id, receiverId: callActive.direction === 'incoming' ? callActive.callerId : currentChat._id });
                    }
                    return;
                }
            }

            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

            localStreamRef.current = stream;
            if (myVideoRef.current) myVideoRef.current.srcObject = stream;

            if (callActive.direction === 'outgoing') {
                setCallStatus(isOnline ? 'Ringing...' : 'Calling...');
                const peer = new Peer({ initiator: true, trickle: false, stream });

                peer.on('signal', data => {
                    if (socket) {
                        socket.emit('callUser', {
                            senderId: currentUser._id,
                            receiverId: currentChat._id,
                            callType: callActive.type,
                            senderName: currentUser.username,
                            signalData: data
                        });
                    }
                });

                peer.on('stream', remoteStream => {
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
                });

                peer.on('error', err => {
                    console.error('Peer error (outgoing):', err);
                    if (!cancelled) endCallLocally();
                });

                // callAccepted is now handled in the dedicated useEffect above
                connectionRef.current = peer;

            } else if (callActive.direction === 'incoming') {
                setCallStatus('Connecting...');
                const peer = new Peer({ initiator: false, trickle: false, stream });

                peer.on('signal', data => {
                    if (socket) {
                        socket.emit('callAccepted', {
                            signal: data,
                            receiverId: currentUser._id,
                            senderId: callActive.callerId
                        });
                    }
                });

                peer.on('stream', remoteStream => {
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
                });

                peer.on('error', err => { console.error('Peer error (receiver):', err); endCallLocally(); });

                peer.signal(callActive.signal);
                connectionRef.current = peer;

                setCallStatus('Connected');
                setCallActive(prev => ({ ...prev, answered: true }));
                startTimer();
            }
        };

        setupMedia();
        return () => {
            cancelled = true;
            if (ringTimeout) clearTimeout(ringTimeout);
        };
    }, [callActive?.direction, callActive?.type, callActive?.answered]);


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
            if (socket) {
                socket.emit("sendMessage", { ...res.data, senderId: currentUser._id, receiverId: currentChat._id, senderName: currentUser.username });
            }
            playSound("send");
            setReplyTo(null);
            refreshConversations();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (msg, forEveryone) => {
        try {
            await axios.put(`${API}/api/messages/delete/${msg._id}`, { userId: currentUser._id, deleteForEveryone: forEveryone });
            if (forEveryone) {
                setMessages((prev) => prev.map((m) => m._id === msg._id ? { ...m, text: "🚫 Deleted", deletedForEveryone: true, fileUrl: "" } : m));
                if (socket) {
                    socket.emit("deleteMessage", { messageId: msg._id, receiverId: conversation.members.find(m => m !== currentUser._id), conversationId: conversation._id });
                }
            } else {
                setMessages((prev) => prev.filter((m) => m._id !== msg._id));
            }
            setContextMenu(null);
        } catch (err) { console.error(err); }
    };

    const initiateCall = async (type) => {
        const text = type === "video" ? "🎥 Video Call" : "📞 Audio Call";
        await handleSendMsg({ text, fileUrl: "", fileType: "call" });
        // Setting callActive triggers the useEffect which creates the Peer.
        // The Peer's 'signal' event will emit 'callUser' with the real SDP data.
        setCallActive({ type, direction: 'outgoing' });
    };

    const endCall = () => {
        const duration = callTimer;
        const type = callActive?.type;
        const amAnswered = callActive?.answered;
        const peerId = callActive?.direction === 'incoming' ? callActive.callerId : currentChat._id;

        if (socket) {
            socket.emit("endCall", { senderId: currentUser._id, receiverId: peerId });
        }

        endCallLocally();

        if (amAnswered) {
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            const durationStr = `${mins}:${secs < 10 ? '0' + secs : secs}`;
            toast.info(`${type === 'video' ? '🎥 Video' : '📞 Audio'} call ended • ${durationStr}`, { position: "top-center", autoClose: 3000 });
        }
    };

    const formatCallTimer = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
    };

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return 'Last seen recently';
        const d = new Date(lastSeen);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'Last seen just now';
        if (diffMins < 60) return `Last seen ${diffMins}m ago`;
        if (diffHours < 24) return `Last seen ${diffHours}h ago`;
        if (diffDays === 1) return 'Last seen yesterday';
        if (diffDays < 7) return `Last seen ${diffDays} days ago`;
        return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    };

    const openMedia = (url) => setViewingMedia(url);

    const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const getDateLabel = (d) => {
        const date = new Date(d);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        if (isToday) {
            return `TODAY, ${date.toLocaleDateString([], { month: 'long', day: 'numeric' }).toUpperCase()}`;
        }
        return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
    };

    const getDateKey = (d) => new Date(d).toDateString();
    let lastDateKey = null;

    return (
        <div className="flex flex-col h-full w-full bg-transparent relative">
            <ToastContainer />

            {/* Call Overlay */}
            {callActive && (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center call-overlay bg-black/80">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460] opacity-95"></div>

                    {/* Remote Video Stream Preview */}
                    <div className={`absolute inset-0 z-0 ${callActive.type === 'video' && callActive.answered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover rounded-3xl"
                        />
                    </div>

                    <div className="relative z-[40] flex flex-col items-center gap-6 animate-fade-in w-full h-full justify-between pb-10 pt-20 pointer-events-none">
                        {/* Avatar with pulse ring — always visible for audio, visible for video only when not yet connected */}
                        {(!callActive.answered || callActive.type === 'audio') ? (
                            <div className="flex flex-col items-center pointer-events-auto">
                                <div className="relative">
                                    {/* Only pulse while waiting for answer */}
                                    {!callActive.answered && (
                                        <>
                                            <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                                            <div className="absolute -inset-3 rounded-full border-2 border-white/20 animate-pulse"></div>
                                        </>
                                    )}
                                    <img
                                        src={getAvatarUrl(currentChat)}
                                        alt=""
                                        className={`w-28 h-28 rounded-full object-cover border-4 shadow-2xl relative z-10 bg-white/10 transition-all duration-500
                                            ${callActive.answered ? 'border-green-400/60' : 'border-white/30'}`}
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${currentChat.username}&background=E8EDF2&color=2B3A4E&size=128`; }}
                                    />
                                    {callActive.type === 'video' && (
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center z-20 shadow-lg">
                                            <BsCameraVideo className="text-white text-sm" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center mt-6">
                                    <h2 className="text-white text-2xl font-bold tracking-tight drop-shadow-md">{currentChat.username}</h2>
                                    <div className="flex items-center justify-center gap-2 mt-2 drop-shadow-md">
                                        {callActive.answered ? (
                                            <>
                                                {/* Green dot + timer */}
                                                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                                <p className="text-white/90 text-sm font-medium">
                                                    {callActive.type === 'video' ? 'Video Call' : 'Audio Call'} &bull; {formatCallTimer(callTimer)}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                {/* Pulsing blue dot + status text */}
                                                <span className="w-2 h-2 rounded-full bg-blue-400 connecting-pulse"></span>
                                                <p className="text-white/70 text-sm font-medium connecting-pulse">
                                                    {callStatus || (callActive.direction === 'outgoing' ? 'Calling...' : 'Connecting...')}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {/* Audio waveform — only when an audio call is live */}
                                    {callActive.answered && callActive.type === 'audio' && (
                                        <div className="audio-wave mt-4 mx-auto">
                                            <div className="audio-wave-bar"></div>
                                            <div className="audio-wave-bar"></div>
                                            <div className="audio-wave-bar"></div>
                                            <div className="audio-wave-bar"></div>
                                            <div className="audio-wave-bar"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full flex justify-between px-8 absolute top-8 pointer-events-auto drop-shadow-md">
                                <div className="text-white">
                                    <h2 className="text-xl font-bold">{currentChat.username}</h2>
                                    <p className="text-white/80 text-xs font-medium">{formatCallTimer(callTimer)}</p>
                                </div>
                            </div>
                        )}


                        {/* Call Controls */}
                        <div className="flex items-center gap-5 mt-auto mb-10 pointer-events-auto relative" style={{ zIndex: 9999 }}>
                            <button
                                onClick={() => setCallMuted(!callMuted)}
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${callMuted
                                    ? 'bg-white/30 text-white ring-2 ring-white/50'
                                    : 'bg-white/20 text-white/90 hover:bg-white/30 backdrop-blur-md'
                                    }`}
                                title={callMuted ? "Unmute" : "Mute"}
                            >
                                {callMuted ? <BsMicMute className="text-xl" /> : <BsMic className="text-xl" />}
                            </button>

                            {callActive.type === 'video' && (
                                <button
                                    onClick={() => setCallVideoOff(!callVideoOff)}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${callVideoOff
                                        ? 'bg-white/30 text-white ring-2 ring-white/50'
                                        : 'bg-white/20 text-white/90 hover:bg-white/30 backdrop-blur-md'
                                        }`}
                                    title={callVideoOff ? "Turn on camera" : "Turn off camera"}
                                >
                                    {callVideoOff ? <BsCameraVideoOff className="text-xl" /> : <BsCameraVideo className="text-xl" />}
                                </button>
                            )}

                            <button
                                onClick={endCall}
                                className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-200 ring-4 ring-red-500/30"
                                title="End Call"
                            >
                                <BsTelephoneX className="text-2xl" />
                            </button>
                        </div>
                    </div>

                    {/* Local Video Stream Preview */}
                    {callActive.type === 'video' && (
                        <div className={`absolute shadow-2xl border-2 border-white/20 z-30 overflow-hidden transition-all duration-500
                             ${callActive.answered ? 'bottom-8 right-6 w-36 h-52 rounded-xl bg-black/50 hover:scale-105 pointer-events-auto' : 'inset-0 w-full h-full rounded-3xl bg-transparent pointer-events-none'}`}>
                            <video
                                ref={myVideoRef}
                                autoPlay
                                muted
                                className="w-full h-full object-cover mirror-mode"
                            />
                            {callActive.answered && (
                                <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm pointer-events-none">
                                    You
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/40 backdrop-blur-md border-b border-white/30 transition-all duration-300">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-1.5 rounded-full hover:bg-white/30 transition-colors text-chatx-text-secondary"
                        >
                            <BsArrowLeft className="text-xl" />
                        </button>
                    )}
                    <div className="relative">
                        <img
                            src={getAvatarUrl(currentChat)}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover bg-white/20 shadow-sm"
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${currentChat.username}&background=E8EDF2&color=2B3A4E`; }}
                        />
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-chatx-online border-2 border-white rounded-full"></span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-chatx-text font-bold text-[16px] leading-tight">{currentChat.username}</h3>
                        <p className="text-chatx-text-secondary text-xs">
                            {isTyping ? (
                                <span className="text-chatx-accent font-medium">typing...</span>
                            ) : isOnline ? (
                                <span className="text-green-500 font-medium">Online</span>
                            ) : (
                                <span>{formatLastSeen(currentChat.lastSeen)}</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => initiateCall("audio")} className="p-2 rounded-full hover:bg-white/30 transition-colors group" title="Audio Call">
                        <BsTelephone className="text-chatx-text-secondary text-lg group-hover:text-chatx-primary transition-colors" />
                    </button>
                    <button onClick={() => initiateCall("video")} className="p-2 rounded-full hover:bg-white/30 transition-colors group" title="Video Call">
                        <BsCameraVideo className="text-chatx-text-secondary text-xl group-hover:text-chatx-primary transition-colors" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-white/30 transition-colors">
                        <BsThreeDots className="text-chatx-text-secondary text-xl" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 custom-scrollbar" ref={scrollRef}>
                {messages.map((msg, i) => {
                    const isMine = msg.sender === currentUser._id;
                    const dateKey = getDateKey(msg.createdAt);
                    let showDate = false;
                    if (dateKey !== lastDateKey) { showDate = true; lastDateKey = dateKey; }

                    // Group timestamps: show time after a gap or last in a sequence
                    const nextMsg = messages[i + 1];
                    const showTime = !nextMsg ||
                        nextMsg.sender !== msg.sender ||
                        (new Date(nextMsg.createdAt) - new Date(msg.createdAt)) > 60000;

                    return (
                        <React.Fragment key={msg._id || i}>
                            {showDate && (
                                <div className="flex justify-center my-4">
                                    <span className="bg-white/30 backdrop-blur-md border border-white/20 text-chatx-text-secondary text-[11px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                                        {getDateLabel(msg.createdAt)}
                                    </span>
                                </div>
                            )}

                            {msg.fileType === "call" ? (
                                // ── Call Record Card ──────────────────────────────────────
                                <div className="flex justify-center my-2 animate-fade-in">
                                    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-sm backdrop-blur-md ${isMine
                                        ? 'bg-gradient-to-r from-chatx-primary/10 to-blue-400/10 border-chatx-primary/20'
                                        : 'bg-gradient-to-r from-emerald-400/10 to-teal-400/10 border-emerald-400/20'
                                        }`}>
                                        {/* Direction icon */}
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-chatx-primary/15' : 'bg-emerald-400/15'
                                            }`}>
                                            {msg.text.includes("Video")
                                                ? <BsCameraVideo className={`text-sm ${isMine ? 'text-chatx-primary' : 'text-emerald-500'}`} />
                                                : <BsTelephone className={`text-sm ${isMine ? 'text-chatx-primary' : 'text-emerald-500'}`} />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-chatx-text font-semibold text-[13px]">
                                                {isMine ? '↗ Outgoing' : '↙ Incoming'} {msg.text.includes("Video") ? 'Video' : 'Audio'} call
                                            </span>
                                            <span className="text-[11px] text-chatx-text-secondary">{formatTime(msg.createdAt)}</span>
                                        </div>
                                        {/* Call-back button */}
                                        <button
                                            onClick={() => initiateCall(msg.text.includes("Video") ? "video" : "audio")}
                                            className={`ml-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMine
                                                ? 'bg-chatx-primary/15 hover:bg-chatx-primary/30 text-chatx-primary'
                                                : 'bg-emerald-400/15 hover:bg-emerald-400/30 text-emerald-500'
                                                }`}
                                            title="Call back"
                                        >
                                            <BsTelephone className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1 animate-msg-in`}>
                                    <div
                                        className={`relative max-w-[70%] px-4 py-2.5 shadow-md ${msg.fileType === "audio"
                                            ? isMine
                                                ? "bg-[#1d4ed8] text-white rounded-[2rem] rounded-br-sm"
                                                : "bg-[#e5e7eb] dark:bg-[#1f2937] text-gray-900 dark:text-gray-100 rounded-[2rem] rounded-bl-sm"
                                            : isMine
                                                ? "bg-[#2563eb] text-white rounded-2xl rounded-br-sm"
                                                : "bg-white dark:bg-[#1f2937] text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm border border-gray-100 dark:border-gray-700"
                                            }`}
                                        onContextMenu={(e) => { e.preventDefault(); if (!msg.deletedForEveryone) setContextMenu({ x: e.clientX, y: e.clientY, msg }); }}
                                    >
                                        {msg.replyTo && (
                                            <div className={`text-xs mb-2 border-l-2 pl-2 py-1 rounded ${isMine ? "bg-white/10 border-white/40" : "bg-black/5 border-chatx-accent"}`}>
                                                <p className="font-semibold opacity-80">{msg.replyTo.senderName}</p>
                                                <p className="opacity-60 truncate">{msg.replyTo.text}</p>
                                            </div>
                                        )}

                                        {msg.fileUrl && !msg.deletedForEveryone ? (
                                            <div className="mb-1 cursor-pointer">
                                                {msg.fileType === "image" ? (
                                                    <img
                                                        src={`${API}/images/${msg.fileUrl}`}
                                                        alt="Media"
                                                        className="rounded-lg max-w-full max-h-[300px] object-cover"
                                                        onClick={() => openMedia(`${API}/images/${msg.fileUrl}`)}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerHTML = `<span class="text-xs text-red-400">Failed to load image</span>`;
                                                        }}
                                                    />
                                                ) : msg.fileType === "video" ? (
                                                    <video src={`${API}/images/${msg.fileUrl}`} controls className="rounded-lg max-w-full" />
                                                ) : msg.fileType === "audio" ? (
                                                    // ── Voice Message Bubble ──────────────────────────────
                                                    <div className={`w-full min-w-[220px] flex items-center gap-3 py-1 ${isMine ? '' : ''
                                                        }`}>
                                                        {/* Mic icon */}
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-white/20' : 'bg-chatx-primary/15'
                                                            }`}>
                                                            <BsMic className={`text-sm ${isMine ? 'text-white/90' : 'text-chatx-primary'}`} />
                                                        </div>
                                                        {/* Fake waveform bars */}
                                                        <div className="flex items-center gap-[2px] flex-1 h-7">
                                                            {[10, 16, 8, 20, 14, 18, 10, 22, 12, 16, 8, 18, 14, 10, 16].map((h, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`w-[3px] rounded-full flex-shrink-0 ${isMine ? 'bg-white/60' : 'bg-chatx-primary/60'
                                                                        }`}
                                                                    style={{ height: `${h}px` }}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* Native audio (hidden controls, just source) */}
                                                        <audio
                                                            src={`${API}/images/${msg.fileUrl}`}
                                                            id={`audio-${msg._id}`}
                                                            preload="metadata"
                                                            className="hidden"
                                                        />
                                                        {/* Play button */}
                                                        <button
                                                            onClick={() => {
                                                                const audio = document.getElementById(`audio-${msg._id}`);
                                                                if (audio.paused) audio.play(); else audio.pause();
                                                            }}
                                                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${isMine ? 'bg-white/25 hover:bg-white/35 text-white' : 'bg-chatx-primary/20 hover:bg-chatx-primary/30 text-chatx-primary'
                                                                }`}
                                                            title="Play/Pause"
                                                        >
                                                            <span className="text-xs pl-0.5">▶</span>
                                                        </button>
                                                    </div>
                                                ) : msg.fileType === "file" ? (
                                                    <a href={`${API}/images/${msg.fileUrl}`} target="_blank" rel="noreferrer" download className={`flex items-center gap-3 p-3 rounded-xl ${isMine ? 'bg-white/10' : 'bg-white/40'} hover:opacity-80 transition-opacity`}>
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-chatx-primary/10'}`}>
                                                            <span className="text-lg">📄</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{msg.fileUrl.split('_').slice(1).join('_') || 'Document'}</p>
                                                            <p className={`text-[10px] ${isMine ? 'text-white/60' : 'text-chatx-text-secondary'}`}>Tap to download</p>
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <a href={`${API}/images/${msg.fileUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">📎 Attachment</a>
                                                )}
                                            </div>
                                        ) : msg.text ? (
                                            <p className="text-[15px] leading-relaxed">{msg.text}</p>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* Timestamp row */}
                            {showTime && msg.fileType !== "call" && (
                                <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 px-2`}>
                                    <div className="flex items-center gap-1.5">
                                        {isMine && !msg.deletedForEveryone && (
                                            <span className={`text-xs ${msg.status === "read" ? "text-white/80" : "text-chatx-text-secondary"}`}>
                                                <BsCheckLg className="inline" />
                                                {msg.status === "read" && <BsCheckLg className="inline -ml-1.5" />}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-chatx-text-secondary font-medium">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                {isTyping && (
                    <div className="flex gap-1.5 items-center px-4 py-2">
                        <div className="typing-dot bg-white/60"></div>
                        <div className="typing-dot bg-white/60"></div>
                        <div className="typing-dot bg-white/60"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 pb-4 pt-2 bg-white/30 backdrop-blur-lg border-t border-white/20">
                {replyTo && (
                    <div className="px-4 py-2 bg-white/40 backdrop-blur-md border border-white/30 rounded-t-xl flex justify-between items-center animate-slide-up mb-1 shadow-sm">
                        <div className="text-sm">
                            <span className="text-chatx-accent font-semibold">Replying to {replyTo.senderName}</span>
                            <p className="text-chatx-text-secondary truncate text-xs">{replyTo.text}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-chatx-text-secondary hover:text-chatx-text text-xl">&times;</button>
                    </div>
                )}
                <ChatInput handleSendMsg={handleSendMsg} onTyping={() => socket && socket.emit("typing", { senderId: currentUser._id, receiverId: currentChat._id })} onStopTyping={() => socket && socket.emit("stopTyping", { senderId: currentUser._id, receiverId: currentChat._id })} />
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed z-50 bg-white/80 backdrop-blur-xl border border-white/40 rounded-xl shadow-xl py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 hover:bg-white/50 text-sm flex items-center gap-3 text-chatx-text transition-colors"><BsReply /> Reply</button>
                    {contextMenu.msg.sender === currentUser._id && <button onClick={() => handleDelete(contextMenu.msg, true)} className="w-full text-left px-4 py-2.5 hover:bg-white/50 text-sm text-chatx-danger flex items-center gap-3 transition-colors"><BsTrash /> Delete</button>}
                </div>
            )}

            {/* Media Viewer Modal */}
            {viewingMedia && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-scale-in" onClick={() => setViewingMedia(null)}>
                    <img src={viewingMedia} alt="Full size" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
                    <button className="absolute top-4 right-4 text-white text-3xl p-2 hover:bg-white/10 rounded-full"><BsX /></button>
                </div>
            )}
        </div>
    );
}

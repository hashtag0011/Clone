
import React, { useState, useRef, useEffect } from "react";
import { BsSearch, BsGearFill, BsBoxArrowRight, BsCamera, BsChatDotsFill, BsTelephone, BsCameraVideo, BsTelephoneOutbound, BsTelephoneInbound, BsMoonFill, BsSunFill } from "react-icons/bs";
import axios from "axios";
import FileTransfer from "../utils/FileTransfer";

const API = import.meta.env.VITE_API_URL || "";

export default function Sidebar({
    contacts, conversations, currentUser, onlineUsers,
    typingUsers, currentChat, changeChat, onLogout,
    searchQuery, setSearchQuery, updateCurrentUser
}) {
    const [showMenu, setShowMenu] = useState(false);
    const [activeTab, setActiveTab] = useState("messages");
    const [uploading, setUploading] = useState(false);
    const [callHistory, setCallHistory] = useState([]);
    const [loadingCalls, setLoadingCalls] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("chatx-theme") === "dark";
    });
    const fileInputRef = useRef(null);

    // Apply dark mode class to <html> on mount and toggle
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("chatx-theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("chatx-theme", "light");
        }
    }, [darkMode]);



    const isOnline = (userId) => onlineUsers.some((u) => u.userId === userId);
    const isTyping = (userId) => typingUsers.includes(userId);

    // Filter contacts based on search
    const filteredContacts = contacts.filter(c =>
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by recent activity
    const sortedContacts = [...filteredContacts].sort((a, b) => {
        const convA = conversations.find(c => c.members.includes(a._id));
        const convB = conversations.find(c => c.members.includes(b._id));
        if (convA && convB) return new Date(convB.updatedAt) - new Date(convA.updatedAt);
        if (convA) return -1;
        if (convB) return 1;
        return a.username.localeCompare(b.username);
    });

    // Fetch call history
    useEffect(() => {
        if (activeTab === "calls" && currentUser) {
            setLoadingCalls(true);
            axios.get(`${API}/api/messages/calls/${currentUser._id}`)
                .then((res) => {
                    setCallHistory(res.data);
                    setLoadingCalls(false);
                })
                .catch((err) => {
                    console.error(err);
                    setLoadingCalls(false);
                });
        }
    }, [activeTab, currentUser]);

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return "yesterday";
        } else if (diffDays < 7) {
            return d.toLocaleDateString([], { weekday: 'long' });
        } else {
            return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const { fileName } = await FileTransfer.upload(file);
            const { data } = await axios.put(`${API}/api/users/${currentUser._id}`, {
                userId: currentUser._id,
                avatarImage: fileName,
            });
            updateCurrentUser(data);
            localStorage.setItem("chat-app-user", JSON.stringify(data));
        } catch (err) { console.error(err); }
        setUploading(false);
    };

    const getAvatarUrl = (user) => {
        if (user.avatarImage) {
            return `${API}/images/${user.avatarImage}`;
        }
        return `https://api.multiavatar.com/${user.username}.png`;
    };

    const getContactById = (id) => contacts.find(c => c._id === id);

    const getCallContact = (call) => {
        // Find the conversation for this call
        const conv = conversations.find(c => c._id === call.conversationId);
        if (!conv) return null;
        const otherMemberId = conv.members.find(m => m !== currentUser._id);
        return getContactById(otherMemberId);
    };

    // Group calls by contact for display
    const getGroupedCalls = () => {
        const grouped = {};
        callHistory.forEach(call => {
            const contact = getCallContact(call);
            if (!contact) return;
            if (!grouped[contact._id]) {
                grouped[contact._id] = { contact, calls: [] };
            }
            grouped[contact._id].calls.push(call);
        });
        return Object.values(grouped);
    };

    if (!currentUser) return null;

    return (
        <div className={`w-full lg:w-[380px] lg:min-w-[340px] flex-col h-full bg-white/40 backdrop-blur-md border-r border-white/30 z-20 ${currentChat ? 'hidden lg:flex' : 'flex'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
                <h1 className="text-2xl font-bold text-chatx-primary tracking-tight">Chatx</h1>
                <div className="flex items-center gap-2">
                    {/* Dark mode toggle */}
                    <button
                        onClick={() => setDarkMode(d => !d)}
                        className="p-2 rounded-full hover:bg-white/40 transition-colors"
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode
                            ? <BsSunFill className="text-yellow-400 text-lg" />
                            : <BsMoonFill className="text-chatx-text-secondary text-lg" />}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 rounded-full hover:bg-white/40 transition-colors"
                        >
                            <BsGearFill className="text-chatx-text-secondary text-lg" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-xl border border-white/40 rounded-xl shadow-xl py-1 z-50 overflow-hidden animate-scale-in">
                                {/* Avatar Upload */}
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-chatx-text hover:bg-white/50 transition-colors"
                                >
                                    <BsCamera className="text-lg" />
                                    <span>Change Avatar</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <div className="h-px bg-white/30 mx-2" />
                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-chatx-danger hover:bg-white/50 transition-colors"
                                >
                                    <BsBoxArrowRight className="text-lg" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs - Messages / Calls / Groups */}
            <div className="px-6 pb-4">
                <div className="flex bg-white/30 backdrop-blur-sm rounded-full p-1 border border-white/20">
                    <button
                        onClick={() => setActiveTab("messages")}
                        className={`flex-1 py-2 px-3 rounded-full text-sm font-semibold transition-all duration-200 ${activeTab === "messages"
                            ? "bg-white/80 text-chatx-primary shadow-sm"
                            : "text-chatx-text-secondary hover:text-chatx-text"
                            }`}
                    >
                        Messages
                    </button>
                    <button
                        onClick={() => setActiveTab("calls")}
                        className={`flex-1 py-2 px-3 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${activeTab === "calls"
                            ? "bg-white/80 text-chatx-primary shadow-sm"
                            : "text-chatx-text-secondary hover:text-chatx-text"
                            }`}
                    >
                        <BsTelephone className="text-xs" />
                        Calls
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 py-2 px-3 rounded-full text-sm font-semibold transition-all duration-200 ${activeTab === "groups"
                            ? "bg-white/80 text-chatx-primary shadow-sm"
                            : "text-chatx-text-secondary hover:text-chatx-text"
                            }`}
                    >
                        Groups
                    </button>
                </div>
            </div>

            {/* Search Bar for Messages & Calls */}
            {(activeTab === "messages" || activeTab === "calls") && (
                <div className="px-6 pb-3">
                    <div className="flex items-center gap-2 bg-white/30 hover:bg-white/40 transition-colors border border-white/10 rounded-xl px-3 py-2">
                        <BsSearch className="text-chatx-text-secondary text-sm" />
                        <input
                            type="text"
                            placeholder={activeTab === "messages" ? "Search conversations..." : "Search calls..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-chatx-text placeholder-chatx-text-secondary outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Messages Tab */}
                {activeTab === "messages" && (
                    <>
                        {sortedContacts.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-chatx-text-secondary">
                                <BsSearch className="text-3xl mb-2 opacity-40" />
                                <p className="text-sm opacity-60">No contacts found</p>
                            </div>
                        )}

                        {sortedContacts.map((contact) => {
                            const conv = conversations.find(c => c.members.includes(contact._id));
                            const isSelected = currentChat?._id === contact._id;
                            const online = isOnline(contact._id);
                            const typing = isTyping(contact._id);
                            const unread = conv?.unreadCount || 0;

                            return (
                                <div
                                    key={contact._id}
                                    onClick={() => changeChat(contact)}
                                    className={`flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-all duration-150 ${isSelected
                                        ? "bg-white/60 border-l-4 border-chatx-accent"
                                        : "hover:bg-white/20 border-l-4 border-transparent"
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={getAvatarUrl(contact)}
                                            alt=""
                                            className="w-12 h-12 rounded-full object-cover bg-white/20 shadow-sm"
                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${contact.username}&background=E8EDF2&color=2B3A4E`; }}
                                        />
                                        {online && (
                                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-chatx-online border-2 border-white rounded-full shadow-sm"></span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className={`font-semibold text-[15px] truncate ${unread > 0 ? 'text-chatx-text' : 'text-chatx-text'}`}>
                                                {contact.username}
                                            </h3>
                                            {conv?.lastMessage && (
                                                <span className="text-xs text-chatx-text-secondary ml-2 flex-shrink-0">
                                                    {formatTime(conv.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <p className="text-[13px] text-chatx-text-secondary truncate pr-2">
                                                {typing ? (
                                                    <span className="text-chatx-accent font-medium">typing...</span>
                                                ) : conv?.lastMessage ? (
                                                    <span className={unread > 0 ? 'text-chatx-text font-medium' : ''}>
                                                        {conv.lastMessage.sender === currentUser._id && "You: "}
                                                        {conv.lastMessage.fileType === "call"
                                                            ? (conv.lastMessage.text.includes("Video") ? "🎥 Video Call" : "📞 Audio Call")
                                                            : conv.lastMessage.fileType === "audio"
                                                                ? "🎙 Voice message"
                                                                : conv.lastMessage.bgImage ? "📷 Photo" : conv.lastMessage.fileUrl ? "📎 File" : conv.lastMessage.text
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="italic opacity-60">Tap to chat</span>
                                                )}
                                            </p>

                                            {unread > 0 && (
                                                <span className="bg-chatx-unread text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[20px] h-[20px] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    {unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Calls Tab */}
                {activeTab === "calls" && (
                    <>
                        {loadingCalls ? (
                            <div className="flex flex-col items-center justify-center h-40 text-chatx-text-secondary">
                                <div className="w-8 h-8 border-2 border-chatx-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-sm opacity-60">Loading call history...</p>
                            </div>
                        ) : callHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-chatx-text-secondary">
                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                                    <BsTelephone className="text-2xl opacity-40" />
                                </div>
                                <p className="text-sm opacity-60 font-medium">No calls yet</p>
                                <p className="text-xs opacity-40 mt-1">Start a call from a chat</p>
                            </div>
                        ) : (
                            <>
                                {/* Recent label */}
                                <div className="px-6 py-2">
                                    <p className="text-xs font-semibold text-chatx-text-secondary uppercase tracking-wider">Recent</p>
                                </div>

                                {getGroupedCalls().map(({ contact, calls }) => {
                                    const latestCall = calls[0];
                                    const isMine = latestCall.sender === currentUser._id;
                                    const isVideo = latestCall.text?.includes("Video");
                                    const online = isOnline(contact._id);

                                    return (
                                        <div
                                            key={contact._id}
                                            onClick={() => changeChat(contact)}
                                            className="flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-all duration-150 hover:bg-white/20"
                                        >
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={getAvatarUrl(contact)}
                                                    alt=""
                                                    className="w-12 h-12 rounded-full object-cover bg-white/20 shadow-sm"
                                                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${contact.username}&background=E8EDF2&color=2B3A4E`; }}
                                                />
                                                {online && (
                                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-chatx-online border-2 border-white rounded-full shadow-sm"></span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-[15px] truncate text-chatx-text">
                                                    {contact.username}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {isMine ? (
                                                        <BsTelephoneOutbound className="text-chatx-online text-[10px]" />
                                                    ) : (
                                                        <BsTelephoneInbound className="text-chatx-accent text-[10px]" />
                                                    )}
                                                    <span className="text-[12px] text-chatx-text-secondary">
                                                        {isMine ? "Outgoing" : "Incoming"} {isVideo ? "video" : "audio"} call
                                                    </span>
                                                    {calls.length > 1 && (
                                                        <span className="text-[11px] text-chatx-text-secondary">({calls.length})</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[11px] text-chatx-text-secondary">
                                                    {formatTime(latestCall.createdAt)}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        changeChat(contact);
                                                    }}
                                                    className="p-1.5 rounded-full hover:bg-white/40 transition-colors"
                                                >
                                                    {isVideo ? (
                                                        <BsCameraVideo className="text-chatx-primary text-sm" />
                                                    ) : (
                                                        <BsTelephone className="text-chatx-primary text-sm" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}

                {/* Groups Tab */}
                {activeTab === "groups" && (
                    <div className="flex flex-col items-center justify-center h-40 text-chatx-text-secondary">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                            <BsChatDotsFill className="text-2xl opacity-40" />
                        </div>
                        <p className="text-sm opacity-60 font-medium">No groups yet</p>
                        <p className="text-xs opacity-40 mt-1">Groups coming soon</p>
                    </div>
                )}
            </div>

        </div>
    );
}

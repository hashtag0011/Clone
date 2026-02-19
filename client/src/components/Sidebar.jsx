
import React, { useState, useRef } from "react";
import { BsSearch, BsThreeDots, BsBoxArrowRight, BsCamera, BsPencil } from "react-icons/bs";
import axios from "axios";
import FileTransfer from "../utils/FileTransfer";

const API = "http://localhost:5000";

export default function Sidebar({
    contacts, conversations, currentUser, onlineUsers,
    typingUsers, currentChat, changeChat, onLogout,
    searchQuery, setSearchQuery, updateCurrentUser
}) {
    const [showMenu, setShowMenu] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!currentUser) return null;

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

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);

        try {
            // Use FileTransfer package
            const { fileName } = await FileTransfer.upload(file);

            // Update user profile
            const { data } = await axios.put(`${API}/api/users/${currentUser._id}`, {
                userId: currentUser._id,
                avatarImage: fileName,
            });

            // Update local state (parent)
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

    return (
        <div className="w-[350px] min-w-[320px] flex flex-col h-full border-r border-ios-separator/20 bg-ios-surface/40 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ios-separator/10">
                <div className="flex items-center gap-3">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                        <img
                            src={getAvatarUrl(currentUser)}
                            alt="avatar"
                            className="w-10 h-10 rounded-full border-2 border-ios-primary shadow-lg shadow-ios-primary/20 object-cover"
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`; }}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <BsCamera className="text-white text-xs" />
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            disabled={uploading}
                            className="hidden"
                            accept="image/*"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-ios-success border-2 border-black rounded-full shadow-sm"></span>
                    </div>
                    <span className="text-white font-semibold text-lg tracking-wide">
                        {currentUser.username}
                    </span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
                    >
                        <BsThreeDots className="text-ios-primary text-xl" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-ios-surface/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden transform origin-top-right animate-scale-in">
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-ios-danger hover:bg-white/5 transition-colors"
                            >
                                <BsBoxArrowRight className="text-lg" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3">
                <div className="relative group">
                    <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-text-secondary group-focus-within:text-ios-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-ios-input text-white text-sm rounded-lg pl-10 pr-4 py-2 placeholder-ios-text-secondary/60 focus:ring-2 focus:ring-ios-primary/50 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-2">
                {sortedContacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-ios-text-secondary opacity-60">
                        <BsSearch className="text-3xl mb-2" />
                        <p className="text-sm">No contacts found</p>
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
                            className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                                    ? "bg-ios-primary/20 shadow-lg shadow-ios-primary/10 border border-ios-primary/30"
                                    : "hover:bg-white/5 border border-transparent"
                                }`}
                        >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <img
                                    src={getAvatarUrl(contact)}
                                    alt=""
                                    className={`w-12 h-12 rounded-full object-cover transition-transform duration-300 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${contact.username}&background=0D8ABC&color=fff`; }}
                                />
                                {online && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-ios-success border-2 border-black rounded-full"></span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h3 className={`font-semibold text-[15px] truncate ${isSelected ? 'text-white' : 'text-ios-text'}`}>
                                        {contact.username}
                                    </h3>
                                    {conv?.lastMessage && (
                                        <span className={`text-[11px] font-medium ${unread > 0 ? 'text-ios-primary' : 'text-ios-text-secondary'}`}>
                                            {formatTime(conv.lastMessage.createdAt)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className="text-[13px] text-ios-text-secondary truncate pr-2 h-5">
                                        {typing ? (
                                            <span className="text-ios-primary font-medium animate-pulse">typing...</span>
                                        ) : conv?.lastMessage ? (
                                            <span className={unread > 0 ? 'text-white font-medium' : ''}>
                                                {conv.lastMessage.sender === currentUser._id && "You: "}
                                                {conv.lastMessage.bgImage ? "📷 Photo" : conv.lastMessage.fileUrl ? "📎 File" : conv.lastMessage.text}
                                            </span>
                                        ) : (
                                            <span className="italic opacity-60">Tap to chat</span>
                                        )}
                                    </p>

                                    {unread > 0 && (
                                        <span className="bg-ios-primary text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md shadow-ios-primary/40">
                                            {unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* New Chat FAB (Mini) */}
            <div className="p-4 border-t border-ios-separator/10">
                <button className="w-full bg-ios-surface/50 hover:bg-ios-surface border border-white/5 text-ios-primary font-medium py-2.5 rounded-xl transition-all duration-200 shadow-sm backdrop-blur-md flex items-center justify-center gap-2">
                    <span className="text-xl">+</span> New Chat
                </button>
            </div>
        </div>
    );
}

import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Sidebar from "../components/Sidebar";
import Welcome from "../components/Welcome";
import ChatContainer from "../components/ChatContainer";

const API = "http://localhost:5000";

export default function Chat() {
    const navigate = useNavigate();
    const socket = useRef(null);
    const [contacts, setContacts] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Load current user
    useEffect(() => {
        const stored = localStorage.getItem("chat-app-user");
        if (!stored) { navigate("/login"); return; }
        setCurrentUser(JSON.parse(stored));
    }, [navigate]);

    // Setup socket
    useEffect(() => {
        if (!currentUser) return;
        socket.current = io(API);
        socket.current.emit("addUser", currentUser._id);

        socket.current.on("getUsers", (users) => setOnlineUsers(users));

        socket.current.on("userTyping", ({ senderId }) => {
            setTypingUsers((prev) => prev.includes(senderId) ? prev : [...prev, senderId]);
        });
        socket.current.on("userStopTyping", ({ senderId }) => {
            setTypingUsers((prev) => prev.filter((id) => id !== senderId));
        });

        return () => { if (socket.current) socket.current.disconnect(); };
    }, [currentUser]);

    // Load contacts
    useEffect(() => {
        if (!currentUser) return;
        axios.get(`${API}/api/users`).then((res) => {
            setContacts(res.data.filter((u) => u._id !== currentUser._id));
        }).catch(console.error);
    }, [currentUser]);

    // Load conversations
    const loadConversations = useCallback(async () => {
        if (!currentUser) return;
        try {
            const res = await axios.get(`${API}/api/conversations/${currentUser._id}`);
            setConversations(res.data);
        } catch (err) { console.error(err); }
    }, [currentUser]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // Listen for new messages to refresh conversation list
    useEffect(() => {
        if (!socket.current) return;
        const handler = () => { loadConversations(); };
        socket.current.on("getMessage", handler);
        return () => { if (socket.current) socket.current.off("getMessage", handler); };
    }, [loadConversations]);

    const handleChatChange = (contact) => {
        setCurrentChat(contact);
    };

    const handleLogout = () => {
        localStorage.removeItem("chat-app-user");
        if (socket.current) socket.current.disconnect();
        navigate("/login");
    };

    return (
        <>
            {/* Liquid Background */}
            <div className="liquid-bg">
                <div className="liquid-blob blob-1"></div>
                <div className="liquid-blob blob-2"></div>
                <div className="liquid-blob blob-3"></div>
            </div>

            {/* Main Container */}
            <div className="h-screen w-screen flex items-center justify-center p-0 lg:p-6 overflow-hidden">
                <div className="w-full h-full lg:max-w-[1400px] lg:h-[90vh] flex overflow-hidden lg:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-2xl bg-black/40">
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
                    <div className="flex-1 flex flex-col relative">
                        {currentChat ? (
                            <ChatContainer
                                currentChat={currentChat}
                                currentUser={currentUser}
                                socket={socket}
                                onlineUsers={onlineUsers}
                                typingUsers={typingUsers}
                                refreshConversations={loadConversations}
                            />
                        ) : (
                            <Welcome currentUser={currentUser || { username: "User" }} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}


import React from "react";
import { BsChatDotsFill } from "react-icons/bs";

export default function Welcome({ currentUser }) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-transparent">
            <div className="flex flex-col items-center gap-4 animate-fade-in relative z-10">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border-2 border-white/30 mb-2">
                    <BsChatDotsFill className="text-white text-4xl drop-shadow-md" />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">
                        Welcome, {currentUser.username}!
                    </h2>
                    <p className="text-white/80 text-sm max-w-[280px] drop-shadow-sm">
                        Select a conversation from the sidebar to start chatting.
                    </p>
                </div>
            </div>
        </div>
    );
}

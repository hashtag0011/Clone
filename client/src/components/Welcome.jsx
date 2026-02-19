
import React from "react";
import { BsWhatsapp } from "react-icons/bs";

export default function Welcome({ currentUser }) {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden backdrop-blur-3xl bg-black/60 z-50">
            {/* Animated Background Blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ios-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ios-secondary/20 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>

            {/* Glass Card */}
            <div className="relative z-10 glass-panel p-12 rounded-3xl flex flex-col items-center text-center max-w-md mx-4 border border-white/10 shadow-2xl shadow-black/50">
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-ios-primary blur-2xl opacity-40 rounded-full"></div>
                    <BsWhatsapp className="text-6xl text-white relative z-10 drop-shadow-lg" />
                </div>

                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mb-4 tracking-tight">
                    Welcome, {currentUser.username}
                </h1>

                <p className="text-ios-text-secondary text-lg font-light leading-relaxed mb-8">
                    Select a conversation from the sidebar to start messaging in
                    <span className="text-ios-primary font-medium ml-1">Liquid Style</span>.
                </p>

                <div className="flex gap-3">
                    <span className="w-2 h-2 rounded-full bg-ios-danger animate-bounce delay-0"></span>
                    <span className="w-2 h-2 rounded-full bg-ios-warning animate-bounce delay-100"></span>
                    <span className="w-2 h-2 rounded-full bg-ios-success animate-bounce delay-200"></span>
                </div>
            </div>

            <p className="absolute bottom-8 text-white/20 text-xs tracking-widest uppercase font-semibold">
                End-to-End Encrypted
            </p>
        </div>
    );
}

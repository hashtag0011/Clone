
import React, { useState, useRef, useEffect } from "react";
import Picker from "emoji-picker-react";
import { BsEmojiSmile, BsPaperclip, BsCamera, BsMic, BsStopCircle, BsX } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import FileTransfer from "../utils/FileTransfer";

export default function ChatInput({ handleSendMsg, onTyping, onStopTyping }) {
    const [msg, setMsg] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const typingTimeout = useRef(null);
    const inputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);

    const handleEmojiClick = (emojiData) => {
        setMsg((prev) => prev + emojiData.emoji);
        inputRef.current?.focus();
    };

    const handleTypingInput = (e) => {
        setMsg(e.target.value);
        onTyping();
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => onStopTyping(), 2000);
    };

    const sendChat = (e) => {
        e.preventDefault();
        if (msg.trim().length > 0) {
            handleSendMsg({ text: msg.trim(), fileUrl: "", fileType: "text" });
            setMsg("");
            onStopTyping();
            clearTimeout(typingTimeout.current);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            sendChat(e);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);

        try {
            // Use our new "FileTransfer" package
            const { fileName, fileType } = await FileTransfer.upload(file, (progress) => {
                console.log(`Upload progress: ${progress}%`);
            });
            handleSendMsg({ text: "", fileUrl: fileName, fileType });
        } catch (err) {
            console.error(err);
            alert("File upload failed.");
        }

        setUploading(false);
        e.target.value = "";
    };

    // Audio Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
            };

            mediaRecorderRef.current.start();
            setRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
    };

    const sendAudio = async () => {
        if (!audioBlob) return;
        setUploading(true);

        try {
            const { fileName, fileType } = await FileTransfer.uploadAudio(audioBlob);
            handleSendMsg({ text: "", fileUrl: fileName, fileType: "audio" });
            setAudioBlob(null);
        } catch (err) { console.error(err); }
        setUploading(false);
    };

    const formatDuration = (sec) => {
        const min = Math.floor(sec / 60);
        const s = sec % 60;
        return `${min}:${s < 10 ? "0" + s : s}`;
    };

    // Close emoji picker on outside click
    useEffect(() => {
        const handler = (e) => {
            if (showEmoji && !e.target.closest(".emoji-area")) setShowEmoji(false);
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [showEmoji]);

    return (
        <div className="flex items-center gap-2 bg-ios-surface/60 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 shadow-lg relative min-h-[50px]">
            {recording ? (
                <div className="flex items-center gap-4 w-full px-2 animate-fade-in">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]"></div>
                    <span className="text-white font-mono text-sm">{formatDuration(recordingTime)}</span>
                    <div className="flex-1"></div>
                    <button onClick={cancelRecording} className="text-ios-danger text-sm font-medium hover:underline">Cancel</button>
                    <button onClick={stopRecording} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <BsStopCircle className="text-red-500 text-xl" />
                    </button>
                </div>
            ) : audioBlob ? (
                <div className="flex items-center gap-4 w-full px-2 animate-slide-in-right">
                    <button onClick={cancelRecording}><BsX className="text-2xl text-ios-text-secondary hover:text-white" /></button>
                    <div className="flex-1 h-8 bg-white/10 rounded-full p-1 flex items-center justify-center">
                        <span className="text-xs text-white">Voice Message Ready</span>
                    </div>
                    <button onClick={sendAudio} disabled={uploading} className="p-2 bg-ios-primary text-white rounded-full hover:bg-ios-primary/90 transition-transform hover:scale-105">
                        <IoMdSend className="text-lg pl-0.5" />
                    </button>
                </div>
            ) : (
                <>
                    {/* Attachment Button */}
                    <label className="p-2 text-ios-primary hover:bg-white/10 rounded-full cursor-pointer transition-colors relative group">
                        <BsPaperclip className="text-xl rotate-45 transform group-hover:scale-110 transition-transform" />
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>

                    {/* Input Field */}
                    <form className="flex-1 relative" onSubmit={sendChat}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="iMessage"
                            value={msg}
                            onChange={handleTypingInput}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent text-white placeholder-ios-text-secondary/60 text-[15px] px-3 py-2 outline-none"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                        />
                    </form>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 emoji-area">
                        {!msg.trim() && (
                            <>
                                <button className="p-2 text-ios-text-secondary hover:text-white transition-colors" data-tooltip="Camera">
                                    <BsCamera className="text-xl" />
                                </button>
                                <button
                                    onClick={startRecording}
                                    className="p-2 text-ios-text-secondary hover:text-red-500 transition-colors" data-tooltip="Voice"
                                >
                                    <BsMic className="text-xl" />
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setShowEmoji(!showEmoji)}
                            className="p-2 text-ios-text-secondary hover:text-yellow-400 transition-colors"
                        >
                            <BsEmojiSmile className="text-xl" />
                        </button>

                        {msg.trim() && (
                            <button
                                onClick={sendChat}
                                className="p-2 bg-ios-primary text-white rounded-full ml-1 hover:bg-ios-primary/90 transition-transform hover:scale-105 shadow-md shadow-ios-primary/40"
                            >
                                <IoMdSend className="text-lg pl-0.5" />
                            </button>
                        )}

                        {showEmoji && (
                            <div className="absolute bottom-14 right-0 z-50 animate-scale-in origin-bottom-right">
                                <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                    <Picker
                                        onEmojiClick={handleEmojiClick}
                                        theme="dark"
                                        searchDisabled={false}
                                        skinTonesDisabled
                                        width={320}
                                        height={400}
                                        previewConfig={{ showPreview: false }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

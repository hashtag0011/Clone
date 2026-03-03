
import React, { useState, useRef, useEffect } from "react";
import Picker from "emoji-picker-react";
import { BsPaperclip, BsMic, BsStopCircle, BsX, BsSend, BsTrash } from "react-icons/bs";
import { HiOutlineFaceSmile } from "react-icons/hi2";
import FileTransfer from "../utils/FileTransfer";

export default function ChatInput({ handleSendMsg, onTyping, onStopTyping }) {
    const [msg, setMsg] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);

    const recordingInterval = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (showEmoji && !e.target.closest('.emoji-picker-container')) {
                setShowEmoji(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmoji]);

    const handleEmojiClick = (emojiObject) => {
        setMsg((prev) => prev + emojiObject.emoji);
    };

    const handleTyping = (e) => {
        setMsg(e.target.value);
        if (onTyping) onTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (onStopTyping) onStopTyping();
        }, 1000);
    };

    const sendChat = (e) => {
        e.preventDefault();
        if ((msg.trim().length > 0 || attachedFile) && !uploading) {
            if (attachedFile) {
                // Determine type
                const type = attachedFile.type.startsWith('image/') ? 'image' : attachedFile.type.startsWith('video/') ? 'video' : 'file';
                handleUploadAndSend(attachedFile, type, msg);
            } else {
                handleSendMsg({ text: msg, fileUrl: "", fileType: "text" });
            }
            setMsg("");
            setAttachedFile(null);
            if (onStopTyping) onStopTyping();
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) setAttachedFile(file);
    };

    const handleUploadAndSend = async (file, type, text) => {
        setUploading(true);
        try {
            const { fileName } = await FileTransfer.upload(file);
            handleSendMsg({ text: text, fileUrl: fileName, fileType: type });
        } catch (err) { console.error(err); }
        setUploading(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);

            recordingInterval.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) { console.error("Mic access denied", err); }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingInterval.current);
            setIsRecording(false);
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
    };

    const sendAudio = async () => {
        if (audioBlob) {
            setUploading(true);
            const file = new File([audioBlob], "voice_msg.webm", { type: "audio/webm" });
            await handleUploadAndSend(file, "audio", "");
            setAudioBlob(null);
            setUploading(false);
        }
    };

    useEffect(() => {
        if (audioBlob && !isRecording) {
            // Wait for user to confirm send (handled by UI button change)
        }
    }, [audioBlob, isRecording]);

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' + s : s}`;
    };

    return (
        <div className="flex items-center gap-3 px-2 py-2">
            {/* Emoji Button */}
            <div className="relative emoji-picker-container">
                <button onClick={() => setShowEmoji(!showEmoji)} className="text-chatx-text-secondary hover:text-chatx-accent transition-colors p-2 rounded-full hover:bg-white/20">
                    <HiOutlineFaceSmile className="text-2xl" />
                </button>
                {showEmoji && (
                    <div className="absolute bottom-14 left-0 shadow-2xl rounded-2xl animate-fade-in z-50">
                        <Picker
                            onEmojiClick={handleEmojiClick}
                            searchDisabled
                            skinTonesDisabled
                            height={350}
                            width={300}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}
            </div>

            {/* File Attachment */}
            <div className="relative">
                <button
                    onClick={() => fileInputRef.current.click()}
                    className={`text-chatx-text-secondary hover:text-chatx-primary transition-colors p-2 rounded-full hover:bg-white/20 ${attachedFile ? "text-chatx-primary" : ""}`}
                >
                    <BsPaperclip className="text-xl transform rotate-45" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Input / Recording UI */}
            {isRecording || audioBlob ? (
                <div className="flex-1 flex items-center justify-between bg-gradient-to-r from-red-500/10 to-rose-500/10 backdrop-blur-md border border-red-200/40 rounded-2xl px-4 py-2.5 shadow-sm gap-3">
                    {isRecording ? (
                        <>
                            {/* Pulsing record indicator */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.7)]"></span>
                                <span className="text-red-500 font-semibold text-xs font-mono tracking-wider">{formatDuration(recordingTime)}</span>
                            </div>
                            {/* Live waveform bars */}
                            <div className="flex-1 flex items-center justify-center gap-[3px] h-8">
                                {[...Array(18)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-[3px] rounded-full bg-red-400/80"
                                        style={{
                                            height: `${8 + Math.abs(Math.sin((Date.now() / 200) + i * 0.7)) * 20}px`,
                                            animation: `waveBar ${0.8 + (i % 5) * 0.15}s ease-in-out infinite`,
                                            animationDelay: `${i * 0.05}s`
                                        }}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Preview: ready to send */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full bg-chatx-primary shadow-[0_0_6px_rgba(75,112,220,0.6)]"></span>
                                <span className="text-chatx-text font-semibold text-xs font-mono tracking-wider">{formatDuration(recordingTime)}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-[3px] h-8">
                                {[...Array(18)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-[3px] rounded-full bg-chatx-primary/50"
                                        style={{ height: `${6 + ((i * 3) % 16)}px` }}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={cancelRecording}
                            className="w-9 h-9 rounded-full bg-white/40 flex items-center justify-center text-red-500 hover:bg-red-50/80 transition-colors shadow-sm"
                            title="Cancel recording"
                        >
                            <BsTrash className="text-sm" />
                        </button>
                        {isRecording ? (
                            <button
                                onClick={stopRecording}
                                className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"
                                title="Stop recording"
                            >
                                <BsStopCircle className="text-sm" />
                            </button>
                        ) : (
                            <button
                                onClick={sendAudio}
                                disabled={uploading}
                                className="w-9 h-9 rounded-full bg-chatx-primary flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
                                title="Send voice message"
                            >
                                <BsSend className="text-sm pl-0.5" />
                            </button>
                        )}
                    </div>
                </div>

            ) : (
                <form className="flex-1 flex items-center gap-2 bg-white/40 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-2 shadow-sm transition-all focus-within:bg-white/60 focus-within:shadow-md focus-within:border-white/50" onSubmit={(e) => sendChat(e)}>
                    {/* File Preview */}
                    {attachedFile && (
                        <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-lg mr-2 max-w-[150px]">
                            <span className="text-xl flex-shrink-0">
                                {attachedFile.type.startsWith('image/') ? '📷' : attachedFile.type.startsWith('video/') ? '🎥' : '📄'}
                            </span>
                            <span className="text-xs truncate">{attachedFile.name}</span>
                            <button type="button" onClick={() => setAttachedFile(null)} className="ml-1 hover:bg-black/10 rounded-full p-0.5">
                                <BsX />
                            </button>
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-chatx-text placeholder-chatx-text-secondary placeholder-opacity-70 text-[15px]"
                        value={msg}
                        onChange={handleTyping}
                    />

                    {(msg.length > 0 || attachedFile) ? (
                        <button
                            type="submit"
                            className="p-2 bg-chatx-primary text-white rounded-full ml-1 hover:opacity-90 transition-opacity shadow-md"
                            title="Send message"
                        >
                            <BsSend className="text-lg pl-0.5" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="p-2 text-chatx-text-secondary hover:bg-white/20 rounded-full transition-colors"
                            title="Record voice message"
                        >
                            <BsMic className="text-xl" />
                        </button>
                    )}

                </form>
            )}
        </div>
    );
}

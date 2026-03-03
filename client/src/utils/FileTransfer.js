
import axios from "axios";

// This self-contained module handles all file transfer logic.
// It can be expanded to support chunked uploads in the future.

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

class FileTransfer {
    /**
     * Uploads a file (image, audio, document) to the server.
     * @param {File} file - The file object to upload.
     * @param {Function} onProgress - Optional callback for progress percentage (0-100).
     * @returns {Promise<{ fileName: string, fileType: string }>} - Resolves with uploaded file metadata.
     */
    static async upload(file, onProgress) {
        if (!file) throw new Error("No file provided");

        // 1. Sanitize filename
        const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
        const fileName = Date.now() + "_" + safeName;

        // 2. Prepare FormData
        const formData = new FormData();
        formData.append("name", fileName);
        formData.append("file", file);

        // 3. Determine Type
        let fileType = "file";
        if (file.type.startsWith("image")) fileType = "image";
        else if (file.type.startsWith("video")) fileType = "video";
        else if (file.type.startsWith("audio")) fileType = "audio";

        // 4. Send Request
        try {
            await axios.post(`${API}/api/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        onProgress(percentCompleted);
                    }
                },
            });

            return { fileName, fileType };
        } catch (error) {
            console.error("FileTransfer Error:", error);
            throw error;
        }
    }

    /**
     * Sends an audio blob (e.g. voice note).
     * @param {Blob} audioBlob - The audio data.
     * @returns {Promise<{ fileName: string, fileType: string }>}
     */
    static async uploadAudio(audioBlob) {
        const fileName = Date.now() + "_voice_note.webm";
        const file = new File([audioBlob], fileName, { type: "audio/webm" });
        return this.upload(file);
    }
}

export default FileTransfer;

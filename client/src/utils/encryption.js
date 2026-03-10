// Simple Web Crypto API based E2EE Mock Implementation

// Helper to derive a key from a conversation ID to act as a shared secret
const getDerivedKey = async (conversationId) => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(conversationId || "default-whatsapp-secret"),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode("whatsapp-clone-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

// Encrypt text
export const encryptMessage = async (text, conversationId) => {
    if (!text) return text;
    try {
        const key = await getDerivedKey(conversationId);
        const encoder = new TextEncoder();
        const encodedText = encoder.encode(text);

        // Initialization Vector
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedText
        );

        // Convert to base64 for easy transport/storage
        const ivBase64 = btoa(String.fromCharCode(...new Uint8Array(iv)));
        const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));

        // Format: IV|CIPHERTEXT
        return `${ivBase64}|${cipherBase64}`;
    } catch (err) {
        console.error("Encryption failed:", err);
        return text; // Fallback to plain text if error
    }
};

// Decrypt text
export const decryptMessage = async (cipherString, conversationId) => {
    if (!cipherString || !cipherString.includes('|')) return cipherString; // Not encrypted
    try {
        const key = await getDerivedKey(conversationId);
        const [ivBase64, cipherBase64] = cipherString.split('|');

        const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
        const cipherText = new Uint8Array(atob(cipherBase64).split('').map(c => c.charCodeAt(0)));

        const decryptedData = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            cipherText
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (err) {
        console.error("Decryption failed:", err);
        return "🔒 [Encrypted Message]";
    }
};

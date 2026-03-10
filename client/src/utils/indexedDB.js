import { openDB } from 'idb';

// Initialize Browser Storage
const setupDB = async () => {
    return openDB('whatsapp-clone-db', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('messages')) {
                db.createObjectStore('messages', { keyPath: '_id' }); // Assuming _id is used from MongoDB
            }
        },
    });
};

// Save a single incoming message to local cache
export const cacheMessageLocal = async (message) => {
    try {
        const db = await setupDB();
        await db.put('messages', message);
    } catch (error) {
        console.error("Failed to cache message:", error);
    }
};

// Save multiple messages to local cache (e.g., when fetching history)
export const cacheMessagesBatchLocal = async (messages) => {
    try {
        const db = await setupDB();
        const tx = db.transaction('messages', 'readwrite');
        for (const msg of messages) {
            tx.store.put(msg);
        }
        await tx.done;
    } catch (error) {
        console.error("Failed to cache messages batch:", error);
    }
}

// Load chats instantly on page load before network finishes
export const loadCachedMessages = async () => {
    try {
        const db = await setupDB();
        return await db.getAll('messages');
    } catch (error) {
        console.error("Failed to load cached messages:", error);
        return [];
    }
};

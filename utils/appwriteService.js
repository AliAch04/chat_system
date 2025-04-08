import { client, account, databases, storage, realtime, DATABASE_ID, USERS_COLLECTION_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID } from '../lib/appwrite';
import { Query, ID } from 'appwrite';

// Authentication utilities
export const createAccount = async (email, password, name) => {
  try {
    const newAccount = await account.create(ID.unique(), email, password, name);
    
    // Create user document in database
    const user = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      ID.unique(),
      {
        user_id: newAccount.$id,
        name: name,
        email: email,
        last_active: new Date().toISOString(),
        is_online: true
      }
    );
    
    return { newAccount, user };
  } catch (error) {
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    return await account.createEmailSession(email, password);
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    return await account.deleteSession('current');
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const accountDetails = await account.get();
    const userData = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('user_id', accountDetails.$id)]
    );
    
    if (userData.documents.length > 0) {
      return userData.documents[0];
    }
    
    return accountDetails;
  } catch (error) {
    throw error;
  }
};

// User status utilities
export const updateUserStatus = async (userId, isOnline) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        is_online: isOnline,
        last_active: new Date().toISOString()
      }
    );
  } catch (error) {
    throw error;
  }
};

// Conversation utilities
export const getConversations = async (userId) => {
  try {
    return await databases.listDocuments(
      DATABASE_ID,
      CONVERSATIONS_COLLECTION_ID,
      [
        Query.contains('participants', userId)
      ]
    );
  } catch (error) {
    throw error;
  }
};

export const createConversation = async (participants) => {
  try {
    const now = new Date().toISOString();
    return await databases.createDocument(
      DATABASE_ID,
      CONVERSATIONS_COLLECTION_ID,
      ID.unique(),
      {
        participants: participants,
        created_at: now,
        updated_at: now
      }
    );
  } catch (error) {
    throw error;
  }
};

// Message utilities
export const getMessages = async (conversationId) => {
  try {
    return await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      [
        Query.equal('conversation_id', conversationId),
        Query.orderDesc('created_at')
      ]
    );
  } catch (error) {
    throw error;
  }
};

export const sendMessage = async (conversationId, userId, content) => {
  try {
    const now = new Date().toISOString();
    
    // Create message
    const newMessage = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      ID.unique(),
      {
        conversation_id: conversationId,
        sender_id: userId,
        content: content,
        created_at: now,
        is_read: false
      }
    );
    
    // Update conversation with last message
    await databases.updateDocument(
      DATABASE_ID,
      CONVERSATIONS_COLLECTION_ID,
      conversationId,
      {
        last_message: content,
        last_message_at: now,
        updated_at: now
      }
    );
    
    return newMessage;
  } catch (error) {
    throw error;
  }
};

// Subscription utilities
export const subscribeToConversations = (userId, callback) => {
  return realtime.subscribe(`databases.${DATABASE_ID}.collections.${CONVERSATIONS_COLLECTION_ID}.documents`, response => {
    const { events, payload } = response;
    
    // Only process events for conversations the user is part of
    if (payload.participants && payload.participants.includes(userId)) {
      callback(events, payload);
    }
  });
};

export const subscribeToMessages = (conversationId, callback) => {
  return realtime.subscribe(`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`, response => {
    const { events, payload } = response;
    
    if (payload.conversation_id === conversationId) {
      callback(events, payload);
    }
  });
};

// Get user
export const getUser = async (userId) => {
  try {
    const userData = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('user_id', userId)]
    );
    
    if (userData.documents.length > 0) {
      return userData.documents[0];
    }
    
    return null;
  } catch (error) {
    throw error;
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    return await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID
    );
  } catch (error) {
    throw error;
  }
};
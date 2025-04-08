import React, { createContext, useState, useEffect, useContext } from 'react';
import { databases, realtime, DATABASE_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID } from '../appwrite';
import { useAuth } from './AuthContext';
import { Query } from 'appwrite';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations();
      subscribeToConversations();
    }
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.$id);
      subscribeToMessages(activeConversation.$id);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.contains('participants', user.user_id)
        ]
      );
      setConversations(response.documents);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [
          Query.equal('conversation_id', conversationId),
          Query.orderDesc('created_at')
        ]
      );
      setMessages(response.documents);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content) => {
    if (!activeConversation || !user) return;
    
    try {
      const now = new Date().toISOString();
      
      // Create message
      const newMessage = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        {
          conversation_id: activeConversation.$id,
          sender_id: user.user_id,
          content: content,
          created_at: now,
          is_read: false
        }
      );
      
      // Update conversation with last message
      await databases.updateDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        activeConversation.$id,
        {
          last_message: content,
          last_message_at: now,
          updated_at: now
        }
      );
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  const createConversation = async (participantId, participantName) => {
    if (!user) return null;
    
    try {
      // Check if conversation already exists
      const existingConvos = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          Query.contains('participants', user.user_id),
          Query.contains('participants', participantId)
        ]
      );
      
      if (existingConvos.documents.length > 0) {
        return existingConvos.documents[0];
      }
      
      // Create new conversation
      const now = new Date().toISOString();
      const newConversation = await databases.createDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        ID.unique(),
        {
          participants: [user.user_id, participantId],
          created_at: now,
          updated_at: now
        }
      );
      
      await loadConversations();
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  // Real-time subscriptions
  const subscribeToConversations = () => {
    if (!user) return;
    
    // Subscribe to conversations collection
    const unsubscribe = realtime.subscribe(`databases.${DATABASE_ID}.collections.${CONVERSATIONS_COLLECTION_ID}.documents`, response => {
      const { events, payload } = response;
      
      // Only process events for conversations the user is part of
      if (payload.participants && payload.participants.includes(user.user_id)) {
        if (events.includes('databases.*.collections.*.documents.*.create')) {
          setConversations(prev => [payload, ...prev]);
        } else if (events.includes('databases.*.collections.*.documents.*.update')) {
          setConversations(prev => 
            prev.map(conv => conv.$id === payload.$id ? payload : conv)
          );
        } else if (events.includes('databases.*.collections.*.documents.*.delete')) {
          setConversations(prev => 
            prev.filter(conv => conv.$id !== payload.$id)
          );
        }
      }
    });
    
    return unsubscribe;
  };

  const subscribeToMessages = (conversationId) => {
    // Subscribe to messages for the active conversation
    const unsubscribe = realtime.subscribe(`databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`, response => {
      const { events, payload } = response;
      
      if (payload.conversation_id === conversationId) {
        if (events.includes('databases.*.collections.*.documents.*.create')) {
          setMessages(prev => [payload, ...prev]);
        } else if (events.includes('databases.*.collections.*.documents.*.update')) {
          setMessages(prev => 
            prev.map(msg => msg.$id === payload.$id ? payload : msg)
          );
        } else if (events.includes('databases.*.collections.*.documents.*.delete')) {
          setMessages(prev => 
            prev.filter(msg => msg.$id !== payload.$id)
          );
        }
      }
    });
    
    return unsubscribe;
  };

  const value = {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    sendMessage,
    createConversation,
    loadConversations
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
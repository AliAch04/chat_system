import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '../appwrite';
import { Query } from 'appwrite';
import { Ionicons } from '@expo/vector-icons';

const ConversationListScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { conversations, loading, setActiveConversation, loadConversations } = useChat();
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    if (user) {
      loadConversations();
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Get all users
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID
      );
      
      // Create a map of user_id to user data
      const map = {};
      response.documents.forEach(user => {
        map[user.user_id] = user;
      });
      
      setUserMap(map);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    
    // Find the other participant
    const otherParticipantId = conversation.participants.find(
      participantId => participantId !== user.user_id
    );
    
    const otherUser = userMap[otherParticipantId];
    const userName = otherUser ? otherUser.name : 'User';
    const isOnline = otherUser ? otherUser.is_online : false;
    
    navigation.navigate('Chat', { 
      name: userName,
      isOnline: isOnline,
      userId: otherParticipantId
    });
  };

  const handleNewChat = async () => {
    try {
      // Get all users except current user
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.notEqual('user_id', user.user_id)]
      );
      
      // Show user selection modal/screen
      // For simplicity, just show the first user that's not the current user
      if (response.documents.length > 0) {
        const otherUser = response.documents[0];
        
        // Navigate to chat with this user
        navigation.navigate('Chat', {
          name: otherUser.name,
          isOnline: otherUser.is_online,
          userId: otherUser.user_id
        });
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const renderConversationItem = ({ item }) => {
    // Find the other participant
    const otherParticipantId = item.participants.find(
      participantId => participantId !== user.user_id
    );
    
    const otherUser = userMap[otherParticipantId];
    const userName = otherUser ? otherUser.name : 'User';
    const isOnline = otherUser ? otherUser.is_online : false;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleSelectConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.conversationInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || 'Start a conversation'}
          </Text>
        </View>
        
        {item.last_message_at && (
          <Text style={styles.timeText}>
            {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  // Set up navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={item => item.$id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubText}>Start a new chat to begin messaging</Text>
          </View>
        }
      />
      
      <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
        <Ionicons name="chatbubble-ellipses" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  lastMessage: {
    color: '#666',
    fontSize: 14,
  },
  timeText: {
    color: '#999',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  logoutButton: {
    marginRight: 15,
  },
});

export default ConversationListScreen;
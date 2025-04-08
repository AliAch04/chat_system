import React, { createContext, useState, useEffect, useContext } from 'react';
import { account, databases, DATABASE_ID, USERS_COLLECTION_ID } from '../lib/appwrite';
import { ID } from 'appwrite';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const session = await account.getSession('current');
      if (session) {
        const accountDetails = await account.get();
        const userData = await databases.listDocuments(
          DATABASE_ID,
          USERS_COLLECTION_ID,
          [
            account.id === accountDetails.$id ? `user_id=${accountDetails.$id}` : null
          ].filter(Boolean)
        );
        
        if (userData.documents.length > 0) {
          setUser(userData.documents[0]);
          updateUserStatus(userData.documents[0].$id, true);
        } else {
          setUser(accountDetails);
        }
      }
    } catch (error) {
      console.error('Session error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      await account.createEmailSession(email, password);
      await checkUserStatus();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email, password, name) => {
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
      
      await login(email, password);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await updateUserStatus(user.$id, false);
      }
      await account.deleteSession('current');
      setUser(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  const updateUserStatus = async (userId, isOnline) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        userId,
        {
          is_online: isOnline,
          last_active: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  // Set up a listener to update status when app is closed or opened
  useEffect(() => {
    if (user) {
      // Update status to online when component mounts
      updateUserStatus(user.$id, true);
      
      // Set up event listener for app state changes
      const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'active') {
          updateUserStatus(user.$id, true);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          updateUserStatus(user.$id, false);
        }
      };
      
      // Clean up the subscription when unmounting
      return () => {
        updateUserStatus(user.$id, false);
      };
    }
  }, [user]);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
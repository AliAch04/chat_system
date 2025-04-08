// setup-appwrite.js
import { Client, Databases, ID } from 'appwrite';

const setupAppwrite = async () => {
  const client = new Client();
  
  client
    .setEndpoint('https://cloud.appwrite.io/v1') // Replace with your Appwrite endpoint
    .setProject('chat-system') // Replace with your project ID
    .setKey('API_key'); // Replace with your API key
  
  const databases = new Databases(client);
  
  // Create database
  try {
    const database = await databases.create(ID.unique(), 'Chat App Database');
    console.log('Database created:', database);
    
    const DATABASE_ID = database.$id;
    
    // Create Users Collection
    const usersCollection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'Users',
      [
        { name: 'user_id', type: 'string', required: true, array: false },
        { name: 'name', type: 'string', required: true, array: false },
        { name: 'email', type: 'string', required: true, array: false },
        { name: 'last_active', type: 'datetime', required: false, array: false },
        { name: 'is_online', type: 'boolean', required: true, default: false, array: false },
        { name: 'avatar', type: 'string', required: false, array: false }
      ]
    );
    console.log('Users Collection created:', usersCollection);
    
    // Create Conversations Collection
    const conversationsCollection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'Conversations',
      [
        { name: 'participants', type: 'string', required: true, array: true },
        { name: 'created_at', type: 'datetime', required: true, array: false },
        { name: 'updated_at', type: 'datetime', required: true, array: false },
        { name: 'last_message', type: 'string', required: false, array: false },
        { name: 'last_message_at', type: 'datetime', required: false, array: false }
      ]
    );
    console.log('Conversations Collection created:', conversationsCollection);
    
    // Create Messages Collection
    const messagesCollection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'Messages',
      [
        { name: 'conversation_id', type: 'string', required: true, array: false },
        { name: 'sender_id', type: 'string', required: true, array: false },
        { name: 'content', type: 'string', required: true, array: false },
        { name: 'created_at', type: 'datetime', required: true, array: false },
        { name: 'is_read', type: 'boolean', required: true, default: false, array: false }
      ]
    );
    console.log('Messages Collection created:', messagesCollection);
    
    // Create indexes for faster queries
    await databases.createIndex(
      DATABASE_ID,
      usersCollection.$id,
      'user_id_index',
      'user_id',
      ['user_id'],
      true
    );
    
    await databases.createIndex(
      DATABASE_ID,
      conversationsCollection.$id,
      'participants_index',
      'participants',
      ['participants']
    );
    
    await databases.createIndex(
      DATABASE_ID,
      messagesCollection.$id,
      'conversation_id_index',
      'conversation_id',
      ['conversation_id']
    );
    
    console.log('Setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up Appwrite:', error);
  }
};

setupAppwrite();
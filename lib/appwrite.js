// appwrite.js
import { Client, Account, Databases, Storage, Realtime } from 'appwrite';

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint('https://cloud.appwrite.io/v1') // Replace with your Appwrite endpoint
  .setProject('chat-system'); // Replace with your project ID

// Initialize Appwrite services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const realtime = new Realtime(client);

// Database and collection IDs
const DATABASE_ID = 'chat_app_database';
const USERS_COLLECTION_ID = 'users';
const CONVERSATIONS_COLLECTION_ID = 'conversations';
const MESSAGES_COLLECTION_ID = 'messages';

export { client, account, databases, storage, realtime, DATABASE_ID, USERS_COLLECTION_ID, CONVERSATIONS_COLLECTION_ID, MESSAGES_COLLECTION_ID };
import mongoose from 'mongoose';

let mongoMemoryServer = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log('Connecting to configured MongoDB (Atlas)...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log('Successfully connected to MongoDB Atlas / remote instance.');
      return mongoose.connection;
    } catch (err) {
      console.warn(`Could not connect to configured MONGODB_URI: ${err.message}`);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Production MongoDB connection failed: ${err.message}`);
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MONGODB_URI is required in production mode. Please configure MONGODB_URI in your cloud environment settings.'
    );
  }

  // Local / Test In-Memory MongoDB Fallback
  try {
    console.log('Starting in-memory MongoDB instance for resilient local development / testing...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const fallbackUri = mongoMemoryServer.getUri();
    await mongoose.connect(fallbackUri);
    console.log('Connected to In-Memory MongoDB engine successfully.');
    return mongoose.connection;
  } catch (err) {
    console.error('Failed to initialize MongoDB connection:', err);
    throw err;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
}

export function getDbStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const state = mongoose.connection.readyState;
  const isAtlas = Boolean(process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('127.0.0.1'));
  return {
    state: stateMap[state] || 'unknown',
    isHealthy: state === 1,
    type: isAtlas ? 'mongodb-atlas' : (mongoMemoryServer ? 'in-memory' : 'local-mongodb'),
    name: mongoose.connection.name || 'watchspaces',
  };
}

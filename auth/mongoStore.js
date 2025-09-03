import mongoose from "mongoose";
import config from "#config";
import Session from "../models/Session.model.js";
import chalk from "chalk";

class MongoStore {
  constructor() {
    this.session = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  async init() {
    try {
      if (this.isConnected) {
        return;
      }

      if (this.connectionPromise) {
        return this.connectionPromise;
      }

      this.connectionPromise = this.connectWithRetry();
      await this.connectionPromise;
    } catch (error) {
      console.log(chalk.red("MongoDB Connection Error:"));
      console.log(chalk.red(error.message));
      throw error;
    }
  }

  async connectWithRetry() {
    try {
      console.log(chalk.cyan("📡 Attempting MongoDB connection..."));
      await mongoose.connect(config.mongoUrl, config.mongoOptions);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log(chalk.green("✅ MongoDB Connected Successfully"));

      // Set up connection monitoring
      mongoose.connection.on("error", this.handleConnectionError.bind(this));
      mongoose.connection.on("disconnected", this.handleDisconnection.bind(this));
      mongoose.connection.on("reconnected", this.handleReconnection.bind(this));

      // Set up periodic cleanup
      this.setupPeriodicCleanup();
    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  handleConnectionError(error) {
    console.log(chalk.red("MongoDB Connection Error:"));
    console.log(chalk.red(error.message));
    this.isConnected = false;
    this.attemptReconnect();
  }

  handleDisconnection() {
    console.log(chalk.yellow("⚠️ MongoDB Disconnected"));
    this.isConnected = false;
    this.attemptReconnect();
  }

  handleReconnection() {
    console.log(chalk.green("✅ MongoDB Reconnected"));
    this.isConnected = true;
    this.reconnectAttempts = 0;
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(chalk.red("Max reconnection attempts reached"));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(chalk.yellow(`⚠️ Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`));

    setTimeout(async () => {
      try {
        await this.connectWithRetry();
      } catch (error) {
        console.log(chalk.red("Reconnection attempt failed:"));
        console.log(chalk.red(error.message));
      }
    }, delay);
  }

  setupPeriodicCleanup() {
    // Run cleanup every 24 hours
    setInterval(async () => {
      try {
        await Session.cleanupOldKeys();
      } catch (error) {
        console.error("Error during session cleanup:", error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  async hasSession() {
    try {
      if (!this.isConnected) {
        throw new Error("Not connected to MongoDB");
      }
      const session = await Session.findOne({ sessionId: config.sessionId }).lean();
      return !!session;
    } catch (error) {
      console.error("Error checking session:", error);
      return false;
    }
  }

  async saveSession(sessionData) {
    try {
      if (!this.isConnected) {
        throw new Error("Not connected to MongoDB");
      }

      let session = await Session.findOne({ sessionId: config.sessionId }).lean();
      if (!session) {
        session = new Session({ sessionId: config.sessionId });
      }

      if (sessionData.creds) {
        await session.updateCreds(sessionData.creds);
      }
      if (sessionData.keys) {
        await session.updateKeys(sessionData.keys);
      }

      this.session = session;
      console.log("Session saved to MongoDB");
    } catch (error) {
      console.error("Error saving session:", error);
      throw error;
    }
  }

  async deleteSession() {
    try {
      if (!this.isConnected) {
        throw new Error("Not connected to MongoDB");
      }
      await Session.deleteOne({ sessionId: config.sessionId });
      this.session = null;
      console.log("Session deleted from MongoDB");
    } catch (error) {
      console.error("Error deleting session:", error);
      throw error;
    }
  }

  async close() {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }
}

export default MongoStore;

import mongoose from "mongoose";

// Custom Buffer type handler
const BufferType = {
  type: mongoose.Schema.Types.Mixed,
  get: (v) => {
    if (v && v.type === "Buffer") {
      return Buffer.from(v.data, "base64");
    }
    return v;
  },
  set: (v) => {
    if (Buffer.isBuffer(v)) {
      return {
        type: "Buffer",
        data: v.toString("base64"),
      };
    }
    return v;
  },
};

const SessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    state: {
      creds: {
        noiseKey: {
          private: {
            ...BufferType,
            required: true,
            select: false,
          },
          public: {
            ...BufferType,
            required: true,
          },
        },
        signedIdentityKey: {
          private: {
            ...BufferType,
            required: true,
            select: false,
          },
          public: {
            ...BufferType,
            required: true,
          },
        },
        signedPreKey: {
          keyPair: {
            private: {
              ...BufferType,
              required: true,
              select: false,
            },
            public: {
              ...BufferType,
              required: true,
            },
          },
          signature: {
            ...BufferType,
            required: true,
          },
          keyId: {
            type: Number,
            required: true,
          },
        },
        registrationId: {
          type: Number,
          required: true,
        },
        advSecretKey: {
          type: String,
          required: true,
          select: false,
        },
        processedHistoryMessages: [
          {
            type: Object,
            _id: false,
          },
        ],
        nextPreKeyId: {
          type: Number,
          required: true,
        },
        firstUnuploadedPreKeyId: {
          type: Number,
          required: true,
        },
        accountSettings: {
          unarchiveChats: {
            type: Boolean,
            default: false,
          },
        },
        account: {
          type: Object,
          _id: false,
        },
        me: {
          type: Object,
          _id: false,
        },
        signalIdentities: [
          {
            type: Object,
            _id: false,
          },
        ],
        platform: {
          type: String,
          default: "android",
        },
        routingInfo: {
          type: Object,
          _id: false,
        },
        lastAccountSyncTimestamp: {
          type: Number,
        },
        lastPropHash: {
          type: String,
        },
        myAppStateKeyId: {
          type: String,
        },
        accountSyncCounter: {
          type: Number,
          default: 0,
        },
      },
      keys: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map(),
      },
    },
    keysLastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    readPreference: "primaryPreferred",
    writeConcern: { w: 1 },
    versionKey: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

SessionSchema.index({ "state.creds.registrationId": 1 });
SessionSchema.index({ keysLastUpdated: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // Only expire keys after 1 day

SessionSchema.methods.updateState = async function (newState) {
  try {
    // Always preserve existing credentials
    if (newState.creds) {
      this.state.creds = newState.creds;
    }

    // Update keys if provided
    if (newState.keys) {
      this.state.keys = newState.keys;
      this.keysLastUpdated = new Date();
    }

    await this.validate();
    return this.save({ lean: true });
  } catch (error) {
    console.error("Error updating session state:", error);
    throw error;
  }
};

SessionSchema.methods.updateCreds = async function (newCreds) {
  try {
    this.state.creds = newCreds;
    await this.validate();
    return this.save({ lean: true });
  } catch (error) {
    console.error("Error updating credentials:", error);
    throw error;
  }
};

SessionSchema.methods.updateKeys = async function (newKeys) {
  try {
    this.state.keys = newKeys;
    this.keysLastUpdated = new Date();
    await this.validate();
    return this.save({ lean: true });
  } catch (error) {
    console.error("Error updating keys:", error);
    throw error;
  }
};

SessionSchema.methods.getState = function () {
  return {
    creds: this.state.creds,
    keys: this.state.keys,
  };
};

SessionSchema.methods.getCreds = function () {
  return this.state.creds;
};

SessionSchema.methods.getKeys = function () {
  return this.state.keys;
};

SessionSchema.methods.getSensitiveData = async function () {
  return this.select("+state.creds.noiseKey.private +state.creds.signedIdentityKey.private +state.creds.signedPreKey.keyPair.private +state.creds.advSecretKey").lean();
};

SessionSchema.statics.cleanupOldKeys = async function () {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  return this.updateMany(
    { keysLastUpdated: { $lt: oneDayAgo } },
    {
      $set: {
        "state.keys": {},
        keysLastUpdated: new Date(),
      },
    }
  );
};

SessionSchema.statics.cleanupSessionKeys = async function (sessionId) {
  try {
    await this.updateOne(
      { sessionId },
      {
        $set: {
          "state.keys": {},
          keysLastUpdated: new Date(),
        },
      }
    );
    console.log(`Cleaned up keys for session: ${sessionId}`);
  } catch (error) {
    console.error("Error cleaning up session keys:", error);
    throw error;
  }
};

SessionSchema.methods.getSessionWithoutKeys = async function () {
  return this.select("-state.keys").lean();
};

SessionSchema.methods.updateOnlyCreds = async function (newCreds) {
  try {
    this.state.creds = newCreds;
    await this.validate();
    return this.save({ lean: true });
  } catch (error) {
    console.error("Error updating credentials:", error);
    throw error;
  }
};

const Session = mongoose.model("Session", SessionSchema);

export default Session;

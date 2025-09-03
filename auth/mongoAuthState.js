import { randomBytes } from "node:crypto";
import pkg from "baileys/WAProto/index.js";
const { proto } = pkg;
import { Curve, signedKeyPair } from "baileys/lib/Utils/crypto.js";
import { generateRegistrationId } from "baileys/lib/Utils/generics.js";
import mongoose from "mongoose";
import config from "#config";

const initAuthCreds = () => {
  const identityKey = Curve.generateKeyPair();
  return {
    noiseKey: Curve.generateKeyPair(),
    signedIdentityKey: identityKey,
    signedPreKey: signedKeyPair(identityKey, 1),
    registrationId: generateRegistrationId(),
    advSecretKey: randomBytes(32).toString("base64"),
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSettings: {
      unarchiveChats: false,
    },
  };
};

const BufferJSON = {
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === "Buffer") {
      return {
        type: "Buffer",
        data: Buffer.from(value?.data || value).toString("base64"),
      };
    }
    return value;
  },

  reviver: (_, value) => {
    if (typeof value === "object" && value !== null && (value.buffer === true || value.type === "Buffer")) {
      const val = value.data || value.value;
      return typeof val === "string" ? Buffer.from(val, "base64") : Buffer.from(val || []);
    }
    return value;
  },
};

export const useMongoAuthState = async (sessionId) => {
  // Ensure MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(config.mongoUrl, config.mongoOptions);
  }

  const collection = mongoose.connection.db.collection("sessions");

  // Clean up old keys on startup
  try {
    await collection.updateOne(
      { sessionId },
      {
        $set: {
          "state.keys": {},
          keysLastUpdated: new Date(),
        },
      }
    );
  } catch (error) {
    console.error("Error during session keys cleanup:", error);
    // Continue with initialization even if cleanup fails
  }

  const writeState = async (state) => {
    await collection.updateOne(
      { sessionId },
      {
        $set: { state: JSON.parse(JSON.stringify(state, BufferJSON.replacer)) },
      },
      { upsert: true }
    );
  };

  const readState = async () => {
    const doc = await collection.findOne({ sessionId });
    return doc?.state ? JSON.parse(JSON.stringify(doc.state), BufferJSON.reviver) : null;
  };

  const removeKey = async (key) => {
    await collection.updateOne({ sessionId }, { $unset: { [`state.keys.${key}`]: "" } });
  };

  const savedState = (await readState()) || {};
  const creds = savedState.creds || initAuthCreds();
  const keys = savedState.keys || {}; // Initialize keys from saved state

  const saveFullState = async () => {
    await writeState({ creds, keys });
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            let data = keys[`${type}-${id}`];
            if (type === "app-state-sync-key" && data) {
              data = proto.Message.AppStateSyncKeyData.fromObject(data);
            }
            result[id] = data;
          }
          return result;
        },
        set: async (newData) => {
          for (const category of Object.keys(newData)) {
            for (const id of Object.keys(newData[category])) {
              const value = newData[category][id];
              const key = `${category}-${id}`;
              if (value) {
                keys[key] = value;
              } else {
                delete keys[key];
                await removeKey(key);
              }
            }
          }
          await saveFullState();
        },
      },
    },
    saveCreds: async () => {
      await saveFullState();
    },
  };
};

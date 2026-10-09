import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as aesjs from "aes-js";

// Encrypted session storage for Supabase. The session (too large for the
// keystore) is AES-encrypted and kept in AsyncStorage; the random key that
// unlocks it lives in the phone's secure keystore (Keychain / Keystore).
//
// "Keep me logged in" off: the session stays in memory only and is gone when
// the app is closed.
const REMEMBER_KEY = "ile:remember-me";
const memory = new Map<string, string>();
// The keystore only exists on phones; the web build (previews only) stores
// the session unencrypted.
const ENCRYPT = Platform.OS !== "web";
let remember = true;

export async function loadRememberMe(): Promise<void> {
  remember = (await AsyncStorage.getItem(REMEMBER_KEY)) !== "false";
}

export async function setRememberMe(value: boolean): Promise<void> {
  remember = value;
  await AsyncStorage.setItem(REMEMBER_KEY, value ? "true" : "false");
}

async function encrypt(key: string, value: string): Promise<string> {
  const secret = Crypto.getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(secret, new aesjs.Counter(1));
  const bytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(secret));
  return aesjs.utils.hex.fromBytes(bytes);
}

async function decrypt(key: string, value: string): Promise<string | null> {
  const secretHex = await SecureStore.getItemAsync(key);
  if (!secretHex) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(secretHex), new aesjs.Counter(1));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (memory.has(key)) return memory.get(key) ?? null;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    return ENCRYPT ? decrypt(key, stored) : stored;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!remember) {
      memory.set(key, value);
      await AsyncStorage.removeItem(key);
      if (ENCRYPT) await SecureStore.deleteItemAsync(key);
      return;
    }
    memory.delete(key);
    await AsyncStorage.setItem(key, ENCRYPT ? await encrypt(key, value) : value);
  },
  async removeItem(key: string): Promise<void> {
    memory.delete(key);
    await AsyncStorage.removeItem(key);
    if (ENCRYPT) await SecureStore.deleteItemAsync(key);
  },
};

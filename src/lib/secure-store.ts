import * as SecureStore from "expo-secure-store";

// Supabase 세션 JSON은 Android SecureStore 2048바이트 한도를 넘길 수 있어 나눠 저장한다.
const CHUNK = 1800;

function chunksKey(key: string) {
  return `${key}.chunks`;
}

function partKey(key: string, index: number) {
  return `${key}.${index}`;
}

export const secureStore = {
  async getItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(chunksKey(key));
    const count = Number(countRaw);
    if (!Number.isInteger(count) || count <= 0) return null;
    let value = "";
    for (let i = 0; i < count; i++) {
      value += (await SecureStore.getItemAsync(partKey(key, i))) ?? "";
    }
    return value;
  },
  async setItem(key: string, value: string) {
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    const previous = Number((await SecureStore.getItemAsync(chunksKey(key))) ?? "0");
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(partKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    for (let i = count; i < previous; i++) {
      await SecureStore.deleteItemAsync(partKey(key, i));
    }
    await SecureStore.setItemAsync(chunksKey(key), String(count));
  },
  async removeItem(key: string) {
    const previous = Number((await SecureStore.getItemAsync(chunksKey(key))) ?? "0");
    for (let i = 0; i < previous; i++) {
      await SecureStore.deleteItemAsync(partKey(key, i));
    }
    await SecureStore.deleteItemAsync(chunksKey(key));
  },
};

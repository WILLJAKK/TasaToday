// Adapter de AsyncStorage compatible con React Native (@react-native-async-storage/async-storage)
// y con navegadores web estándar (localStorage).

export const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('[AsyncStorage] Error reading key:', key, e);
    }
    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[AsyncStorage] Error writing key:', key, e);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[AsyncStorage] Error removing key:', key, e);
    }
  },
};

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

export const getItem = (key, fallback = null) => {
  if (!canUseLocalStorage()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
};

export const setItem = (key, value) => {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeItem = (key) => {
  if (!canUseLocalStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const getJson = (key, fallback) => {
  const raw = getItem(key, null);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const setJson = (key, value) => {
  try {
    return setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
};

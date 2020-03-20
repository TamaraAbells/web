import { sha256 } from 'js-sha256';

export function getToken() {
  return window.safeStorage.getItem('posting_key');
}
export function getEncryptedToken() {
  const accessToken = window.safeStorage.getItem('posting_key');

  if (accessToken) {
    return sha256(accessToken);
  } else {
    return null;
  }
}

export function setUsername(username) {
  return window.safeStorage.setItem('username', username);
}

export function setToken(token) {
  return window.safeStorage.setItem('posting_key', token);
}

export function removeToken() {
  return window.safeStorage.removeItem('posting_key');
}


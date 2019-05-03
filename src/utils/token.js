import steemConnectAPI from 'utils/steemConnectAPI';
import { sha256 } from 'js-sha256';

export function getToken() {
  return window.safeStorage.getItem('access_token');
}
export function getEncryptedToken() {
  const accessToken = window.safeStorage.getItem('access_token');

  if (accessToken) {
    return sha256(accessToken);
  } else {
    return null;
  }
}
export function setToken(token) {
  return window.safeStorage.setItem('access_token', token);
}
export function removeToken() {
  return window.safeStorage.removeItem('access_token');
}
export const getLoginURL = (path = window.location.pathname) => steemConnectAPI.getLoginURL(path);


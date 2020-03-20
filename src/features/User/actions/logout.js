import { put, takeLatest } from 'redux-saga/effects';
import { removeToken } from 'utils/token';

/*--------- CONSTANTS ---------*/
const LOGOUT_BEGIN = 'LOGOUT_BEGIN';
const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';
const LOGOUT_FAILURE = 'LOGOUT_FAILURE';

/*--------- ACTIONS ---------*/
export function logoutBegin(token) {
  return { type: LOGOUT_BEGIN, token };
}

export function logoutSuccess() {
  return { type: LOGOUT_SUCCESS };
}

export function logoutFailure(message) {
  return { type: LOGOUT_FAILURE, message };
}

/*--------- REDUCER ---------*/
export function logoutReducer(state, action) {
  switch (action.type) {
    case LOGOUT_BEGIN:
      return {
        ...state,
        me: '',
      };
    default:
      return state;
  }
}

/*--------- SAGAS ---------*/
function* logout() {
  try {
    removeToken();
    yield put(logoutSuccess());
  } catch(e) {
    yield put(logoutFailure(e.message));
  }
}

export default function* logoutManager() {
  yield takeLatest(LOGOUT_BEGIN, logout);
}

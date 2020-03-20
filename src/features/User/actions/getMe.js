import { put, select, takeLatest } from 'redux-saga/effects';
import update from 'immutability-helper';
import { setToken, getToken, getUsername } from 'utils/token';
import { format } from '../utils';
import { selectAppProps } from 'features/App/selectors';
import steem from 'steem';
import api from 'utils/api';

/*--------- CONSTANTS ---------*/
const GET_ME_BEGIN = 'GET_ME_BEGIN';
const REFRESH_ME_BEGIN = 'REFRESH_ME_BEGIN';
const GET_ME_SUCCESS = 'GET_ME_SUCCESS';
const GET_ME_FAILURE = 'GET_ME_FAILURE';

/*--------- ACTIONS ---------*/
export function getMeBegin(token, username) {
  return { type: GET_ME_BEGIN, token, username };
}

export function refreshMeBegin() {
  return { type: REFRESH_ME_BEGIN };
}

export function getMeSuccess(me) {
  return { type: GET_ME_SUCCESS, me };
}

export function getMeFailure(message) {
  return { type: GET_ME_FAILURE, message };
}

/*--------- REDUCER ---------*/
export function getMeReducer(state, action) {
  switch (action.type) {
    case GET_ME_BEGIN: {
      return update(state, {
        isLoading: { $set: true },
      });
    }
    case GET_ME_SUCCESS: {
      return update(state, {
        isLoading: { $set: false },
        me: { $set: action.me.name },
        accounts: {
          [action.me.name]: {$auto: { $merge: action.me }},
        },
      });
    }
    case GET_ME_FAILURE: {
      return update(state, {
        isLoading: { $set: false },
        me: { $set: '' },
      });
    }
    default:
      return state;
  }
}

function getRCInfo(account) {
  return new Promise(function(resolve, reject) {
    steem.api.send('rc_api', {
      method: 'find_rc_accounts',
      params: {'accounts': [account]},
    }, function(_, res) {
      if (res && res.rc_accounts) {
        resolve(res.rc_accounts[0]);
      } else {
        reject(Error('RC API failed'));
      }
    });
  });
}


/*--------- SAGAS ---------*/
function* getMe({ token, username }) {
  try {
    token = token || getToken();
    username = username || getUsername();
    if (!token || !username) {
      yield put(getMeFailure('Not logged in'));
      return;
    }

    const me = (yield steem.api.getAccountsAsync([username]))[0]; // TODO: Get username from safeStorage
    const rcInfo = yield getRCInfo(me.name);
    const appProps = yield select(selectAppProps());

    setToken(token);

    // This is the only time sending non-encrypted token to the server (so server can validate users)
    // Make sure tokens must be filtered from all the logs and should not be saved in a raw format
    const info = yield api.post('/users.json', { user: { username: me.name, token: token } });

    yield put(getMeSuccess(Object.assign({}, format(me, appProps), info, rcInfo)));
  } catch(e) {
    // removeToken();
    // removeUsername();
    console.error(e);
    yield put(getMeFailure(e.message));
  }
}

export function* getMeManager() {
  yield takeLatest(GET_ME_BEGIN, getMe);
}

function* refreshMe() {
  if (!getToken()) {
    return;
  }

  try {
    const me = (yield steem.api.getAccountsAsync(['tabris']))[0]; // TODO: Get username from safeStorage
    const rcInfo = yield getRCInfo(me.name);
    const appProps = yield select(selectAppProps());

    yield put(getMeSuccess(getMeSuccess(Object.assign({}, format(me, appProps), rcInfo))));
  } catch(e) {
    console.error(e);
  }
}

export function* refreshMeManager() {
  yield takeLatest(REFRESH_ME_BEGIN, refreshMe);
}
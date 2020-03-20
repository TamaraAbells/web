import combine from 'utils/combine';
/*
 * EXPORTING REDUCERS and SAGAS
 */
import { getMeManager, refreshMeManager, getMeReducer } from './actions/getMe';
import getAccounts, { getAccountsReducer } from './actions/getAccounts';
import getFollowerCount, { getFollowerCountReducer } from './actions/getFollowerCount';
import getFollowings, { getFollowingsReducer } from './actions/getFollowings';
import setCurrentUser, { setCurrentUserReducer } from './actions/setCurrentUser';
import { updateProfileDraftReducer } from './actions/updateProfileDraft';
import logout, { logoutReducer } from './actions/logout';
import usersReducer from './reducer';

export const initialState = {
  me: '',
  accounts: {},
  followers: {},
  followings: {},
  isLoading: true,
  profileDraft: {
    name: '',
    about: '',
    website: '',
    profile_image: '',
    cover_image: ''
  }
};

export const reducer = (state = initialState, action) => combine(
  [
    getMeReducer,
    getAccountsReducer,
    getFollowerCountReducer,
    getFollowingsReducer,
    logoutReducer,
    setCurrentUserReducer,
    usersReducer,
    updateProfileDraftReducer,
  ],
  state,
  action,
);

// All sagas to be loaded
export default [
  getMeManager,
  refreshMeManager,
  getAccounts,
  getFollowerCount,
  getFollowings,
  logout,
  setCurrentUser,
];

import { put, takeEvery } from 'redux-saga/effects';
import update from 'immutability-helper';
import api from 'utils/api';
import { getPostKey } from '../utils';

/*--------- CONSTANTS ---------*/
const GET_TOP_POSTS_BEGIN = 'GET_TOP_POSTS_BEGIN';
const GET_TOP_POSTS_SUCCESS = 'GET_TOP_POSTS_SUCCESS';
const GET_TOP_POSTS_FAILURE = 'GET_TOP_POSTS_FAILURE';

/*--------- ACTIONS ---------*/
export function getTopPostsBegin(period, tags, page) {
  return { type: GET_TOP_POSTS_BEGIN, period, tags, page };
}

export function getTopPostsSuccess(period, page, result) {
  return { type: GET_TOP_POSTS_SUCCESS, period, page, result };
}

export function getTopPostsFailure(period, message) {
  return { type: GET_TOP_POSTS_FAILURE, period, message };
}

/*--------- REDUCER ---------*/
export function getTopPostsReducer(state, action) {
  switch (action.type) {
    case GET_TOP_POSTS_BEGIN: {
      if (!state.topStatus[action.period]) {
        return update(state, {
          topStatus: { [action.period]: { $set: {
            loading: true,
            finished: false,
          }}},
        });
      }

      return update(state, {
        topStatus: { [action.period]: {
          loading: { $set: true },
        }},
      });
    }
    case GET_TOP_POSTS_SUCCESS: {
      const { period, page, result } = action;

      const newPosts = {};
      const postByAuthor = [];
      result.posts.forEach(post => {
        const key = getPostKey(post);
        if (!state.posts[key]) { // only update non-existing post (preventing race-condition with getPost)
          newPosts[key] = post;
        }
        postByAuthor.push(key);
      });

      let pushOrSet = { $push: postByAuthor };
      if (!state.topPosts[period] || page === 1) {
        pushOrSet = { $set: postByAuthor }
      }

      const newState = {
        posts: { $merge: newPosts },
        topPosts: { [period]: pushOrSet },
        topStatus: { [period]: {
          loading: { $set: false },
          finished: { $set: result.posts.length === 0 },
        }},
      }

      if (result.total_count && result.total_payout) {
        newState.topStatus[period].total_count = { $set: result.total_count }
        newState.topStatus[period].total_payout = { $set: result.total_payout }
      }

      return update(state, newState);
    }
    case GET_TOP_POSTS_FAILURE: {
      return update(state, {
        topStatus: { [action.period]: {
          loading: { $set: false },
          finished: { $set: false },
        }},
      });
    }
    default:
      return state;
  }
}

/*--------- SAGAS ---------*/
function* getTopPosts({ period, tags, page }) {
  try {
    const result = yield api.get(`/posts/top.json`, { period: period, tags: tags, page: page, sort: 'hunt_score' });

    yield put(getTopPostsSuccess(period, page, result));
  } catch(e) {
    yield put(getTopPostsFailure(period, e.message));
  }
}

export default function* getTopPostsManager() {
  yield takeEvery(GET_TOP_POSTS_BEGIN, getTopPosts);
}

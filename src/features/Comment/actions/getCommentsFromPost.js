import { put, select, takeEvery } from 'redux-saga/effects';
import steem from 'steem';
import update from 'immutability-helper';
import { notification } from 'antd';
import { getRootCommentsList } from '../utils/comments';
import { sortCommentsFromSteem } from 'utils/helpers/stateHelpers';
import { selectPosts } from 'features/Post/selectors';
import { hasUpdated } from 'features/Post/utils';
import { postRefreshBegin, postRefreshSuccess } from 'features/Post/actions/refreshPost';
import { calculateContentPayout } from 'utils/helpers/steemitHelpers';
import { shouldCommentVisible } from 'features/Comment/utils/comments';
import pickBy from 'lodash/pickBy';
import api from 'utils/api';

window.retried = 0;
const delay = time => new Promise(resolve => setTimeout(resolve, time));

/*--------- CONSTANTS ---------*/
const GET_COMMENTS_FROM_POST_BEGIN = 'GET_COMMENTS_FROM_POST_BEGIN';
export const GET_COMMENTS_FROM_POST_SUCCESS = 'GET_COMMENTS_FROM_POST_SUCCESS';
const GET_COMMENTS_FROM_POST_FAILURE = 'GET_COMMENTS_FROM_POST_FAILURE';

/*--------- ACTIONS ---------*/
export function getCommentsFromPostBegin(category, author, permlink) {
  return { type: GET_COMMENTS_FROM_POST_BEGIN, category, author, permlink };
}

export function getCommentsFromPostSuccess(postKey, state) {
  return { type: GET_COMMENTS_FROM_POST_SUCCESS, postKey, state };
}

export function getCommentsFromPostFailure(message) {
  return { type: GET_COMMENTS_FROM_POST_FAILURE, message };
}

/*--------- REDUCER ---------*/
export function getCommentsFromPostReducer(state, action) {
  switch (action.type) {
    case GET_COMMENTS_FROM_POST_BEGIN: {
      return update(state, {
        isLoading: { $set: true },
      });
    }
    case GET_COMMENTS_FROM_POST_SUCCESS: {
      return update(state, {
        isLoading: { $set: false },
        commentsFromPost: {
          [action.postKey]: {$auto: {
            // SORTS COMMENTS HERE TO AVOID JUMPS WHEN VOTING
            list: { $set: sortCommentsFromSteem(getRootCommentsList(action.state.content), action.state.content, 'score') },
          }},
        }
      });
    }
    case GET_COMMENTS_FROM_POST_FAILURE: {
      return update(state, {
        isLoading: { $set: false },
      });
    }
    default:
      return state;
  }
}

/*--------- SAGAS ---------*/
function* getCommentsFromPost({ category, author, permlink }) {
  try {
    const state = yield steem.api.getStateAsync(`/${category}/@${author}/${permlink}`);
    const posts = yield select(selectPosts());

    state.content = pickBy(state.content, (comment, key) => shouldCommentVisible(comment));

    const comments_votes = {};
    for(let comment of Object.values(state.content)) {
      if (!comment.parent_author) { // Filter post
        continue;
      }

      comments_votes[comment.post_id] = comment.active_votes
        .filter(vote => vote.voter !== comment.author) // exclude self-vote
        .map(vote => {
          return {
            voter: vote.voter,
            percent: vote.percent
          }
        });
    }

    const res = yield api.post('/comments/scores.json', { comments_votes: JSON.stringify(comments_votes) }, true);
    const { score_table } = res;
    // Update payout_value
    for (const content of Object.values(state.content)) {
      content.payout_value = calculateContentPayout(content); // Sync with local format

      if (content.parent_author) {
        content.scores = score_table[content.post_id].scores;
        content.is_delisted = score_table[content.post_id].is_delisted;
        content.is_disliked = score_table[content.post_id].is_disliked;
      }
    }

    // Refresh post if necessary
    const postKey = `${author}/${permlink}`;
    const post = state.content[postKey];

    if (!post || post.id === 0) {
      // NOTE: API server doesn't output the content right after the posting is made (maybe sychronization issue)
      if (window.retried < 10) {
        window.retried++;
        yield delay(1000);
        console.log('Retried getCommentsFromPost');
        return yield getCommentsFromPost({ category, author, permlink });
      } else {
        throw new Error('No content found on the Steem Blockchain. Please try updating your hunt to re-submit to the blockchain.');
      }
    }

    if (posts && posts[postKey] && hasUpdated(posts[postKey], post) && !posts[postKey].isUpdating) {
      // Update posts cache (on api) with the fresh blockchain data
      yield put(postRefreshBegin(post));
    } else {
      yield put(postRefreshSuccess(post));
    }

    yield put(getCommentsFromPostSuccess(`${author}/${permlink}`, state));
  } catch(e) {
    yield notification['error']({ message: e.message });
    yield put(getCommentsFromPostFailure(e.message));
  }
}

export default function* getCommentsFromPostManager() {
  yield takeEvery(GET_COMMENTS_FROM_POST_BEGIN, getCommentsFromPost);
}

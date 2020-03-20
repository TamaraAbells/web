import { put, select, takeLatest } from 'redux-saga/effects';
import update from 'immutability-helper';
import { notification } from 'antd';
import { createCommentPermlink } from 'utils/helpers/steemitHelpers';
import { selectMyAccount } from 'features/User/selectors';
import { toCustomISOString } from'utils/date';
import { getToken } from 'utils/token';
import { postIncreaseCommentCount } from 'features/Post/actions/refreshPost';
import { selectCurrentPost } from 'features/Post/selectors';
import api from 'utils/api';
import { extractErrorMessage } from 'utils/errorMessage';
import { getPostKey } from 'features/Post/utils';
import steem from 'steem';

/*--------- CONSTANTS ---------*/
const REPLY_BEGIN = 'REPLY_BEGIN';
const EDIT_REPLY_BEGIN = 'EDIT_REPLY_BEGIN';
const REPLY_SUCCESS = 'REPLY_SUCCESS';
const REPLY_EDIT_SUCCESS = 'REPLY_EDIT_SUCCESS';
const REPLY_FAILURE = 'REPLY_FAILURE';
const ADD_COMMENTS_FROM_POST = 'ADD_COMMENTS_FROM_POST';

/*--------- ACTIONS ---------*/
export function replyBegin(parent, body, isModeratorComment = false) {
  return { type: REPLY_BEGIN, parent, body, isModeratorComment };
}

export function editReplyBegin(comment, body) {
  return { type: EDIT_REPLY_BEGIN, comment, body };
}

function replySuccess(parent, tempId, replyObj) {
  return { type: REPLY_SUCCESS, parent, tempId, replyObj };
}

function replyEditSuccess(key, body) {
  return { type: REPLY_EDIT_SUCCESS, key, body };
}

function replyFailure(message) {
  return { type: REPLY_FAILURE, message };
}

function addCommentsFromPosts(parent, tempId) {
  return { type: ADD_COMMENTS_FROM_POST, parent, tempId };
}

/*--------- REDUCER ---------*/
export function replyReducer(state, action) {
  switch (action.type) {
    case REPLY_BEGIN:
    case EDIT_REPLY_BEGIN: {
      return update(state, {
        isPublishing: { $set: true },
        hasSucceeded: { $set: false },
      });
    }
    case ADD_COMMENTS_FROM_POST: {
      const { parent, tempId } = action;
      return update(state, {
        commentsFromPost: {
          [`${parent.author}/${parent.permlink}`]: {
            list: { $push: [tempId] }
          },
        }
      });
    }
    case REPLY_SUCCESS: {
      const { parent, tempId, replyObj } = action;

      return update(state, {
        commentsData: {
          [tempId]: { $set: replyObj },
        },
        commentsChild: {
          [getPostKey(parent)]: { $autoArray: { $push: [tempId] } },
        },
        isPublishing: { $set: false },
        hasSucceeded: { $set: true },
      });
    }
    case REPLY_EDIT_SUCCESS: {
      const { key, body } = action;

      return update(state, {
        commentsData: {
          [key]: { body: { $set: body } },
        },
        isPublishing: { $set: false },
        hasSucceeded: { $set: true },
      });
    }
    case REPLY_FAILURE: {
      return update(state, {
        isPublishing: { $set: false },
      });
    }
    default:
      return state;
  }
}

/*--------- SAGAS ---------*/
function* reply({ parent, body, isModeratorComment }) {
  try {
    const myAccount = yield select(selectMyAccount());
    const post = yield select(selectCurrentPost());

    const permlink = createCommentPermlink(parent.author, parent.permlink);
    const tempId = Math.floor((Math.random() * 1000000) + 1);
    let json_metadata = {
      tags: [ 'steemhunt' ],
      community: 'steemhunt',
      app: 'steemhunt/1.0.0',
    };
    if (isModeratorComment) {
      json_metadata = Object.assign(json_metadata, { verified_by: myAccount.name });
    }

    const now = toCustomISOString(new Date());
    const cashoutTime = toCustomISOString(new Date(Date.now() + 604800));

    const replyObj = {
      author: myAccount.name,
      parent_author: parent.author,
      parent_permlink:  parent.permlink,
      permlink,
      body,
      json_metadata,
      created: now,
      last_update: now,
      active_votes: [],
      cashout_time: cashoutTime,
      net_votes: 0,
      author_reputation: myAccount.reputation,
    };

    yield steem.broadcast.commentAsync(
      getToken(),
      parent.author,
      parent.permlink,
      myAccount.name,
      permlink,
      '',
      body,
      json_metadata,
    );

    // If parent is a post
    if (!parent.parent_author) {
      yield put(addCommentsFromPosts(parent, tempId));
    }

    // NOTE: `post` can be null when reply called from outside of posting page
    if (post) {
      // Update children counter on local & DB
      yield api.increaseCommentCount(post);
      yield put(postIncreaseCommentCount(post));
    }

    yield put(replySuccess(parent, tempId, replyObj));
  } catch (e) {
    console.error(e);
    yield notification['error']({ message: extractErrorMessage(e) });
    yield put(replyFailure(e.message));
  }
}

function* editReply({ comment, body }) {
  try {
    let json_metadata = null;
    try {
      json_metadata = JSON.parse(comment.json_metadata);
    } catch(e) {
      json_metadata = comment.json_metadata;
    }
    yield steem.broadcast.commentAsync(
      getToken(),
      comment.parent_author,
      comment.parent_permlink,
      comment.author,
      comment.permlink,
      '',
      body,
      json_metadata,
    );

    yield put(replyEditSuccess(getPostKey(comment), body));
  } catch(e) {
    console.error(e);
    yield notification['error']({ message: extractErrorMessage(e) });
    yield put(replyFailure(e.message));
  }
}

export function* replyManager() {
  yield takeLatest(REPLY_BEGIN, reply);
}

export function* editReplyManager() {
  yield takeLatest(EDIT_REPLY_BEGIN, editReply);
}

import { put, select, takeEvery } from 'redux-saga/effects';
import steem from 'steem';
import { notification } from 'antd';
import { selectMyAccount } from 'features/User/selectors';
import { getToken } from 'utils/token';
import { postRefreshBegin } from 'features/Post/actions/refreshPost';
import { refreshMeBegin } from 'features/User/actions/getMe';
import { extractErrorMessage } from 'utils/errorMessage';

/*--------- CONSTANTS ---------*/
const VOTE_BEGIN = 'VOTE_BEGIN';
export const VOTE_OPTIMISTIC = 'VOTE_OPTIMISTIC';
export const VOTE_FAILURE = 'VOTE_FAILURE';
export const UPDATE_PAYOUT = 'UPDATE_PAYOUT';

/*--------- ACTIONS ---------*/
export function voteBegin(content, weight, contentType) {
  return { type: VOTE_BEGIN, content, weight, contentType };
}

function voteOptimistic(content, accountName, weight, contentType) {
  return { type: VOTE_OPTIMISTIC, content, accountName, weight, contentType };
}

export function voteFailure(content, accountName, contentType, message) {
  return { type: VOTE_FAILURE, content, accountName, contentType, message };
}

export function updatePayout(content, contentType, myAccount, weight) {
  return { type: UPDATE_PAYOUT, content, contentType, myAccount, weight };
}

/*--------- SAGAS ---------*/
function* vote({ content, weight, contentType }) {
  const myAccount = yield select(selectMyAccount());

  yield put(voteOptimistic(content, myAccount.username, weight, contentType));

  try {
    yield steem.broadcast.voteAsync(getToken(), myAccount.username, content.author, content.permlink, weight);

    // UPDATE PAYOUT
    const { author, permlink } = content;
    const updatedContent = yield steem.api.getContentAsync(author, permlink);

    if (!updatedContent) {
      throw new Error('Cound not fetch the updated content from Steem API');
    }

    if (contentType === 'post') {
      yield put(postRefreshBegin(updatedContent));
    } else {
      yield put(updatePayout(updatedContent, contentType, myAccount, weight));
    }

    yield put(refreshMeBegin());
  } catch(e) {
    yield notification['error']({ message: extractErrorMessage(e) });
    yield put(voteFailure(content, myAccount.username, contentType, e.message));
  }
}

export default function* voteManager() {
  yield takeEvery(VOTE_BEGIN, vote);
}


// FIXME: TODO:
// - why actions twice?

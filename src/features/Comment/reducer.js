import update from 'immutability-helper';
import { manageContentVote } from '../Vote/utils';
import { UPDATE_PAYOUT, VOTE_FAILURE, VOTE_OPTIMISTIC } from '../Vote/actions/vote';
import { GET_COMMENTS_FROM_POST_SUCCESS } from './actions/getCommentsFromPost';
import { getCommentsChildrenLists } from './utils/comments';
import { calculateContentPayout } from 'utils/helpers/steemitHelpers';
import { getUserScore, getRoleBoost } from 'features/User/utils';
import { getPostKey } from 'features/Post/utils';

export default function commentsReducer(state, action) {
  switch (action.type) {
    case GET_COMMENTS_FROM_POST_SUCCESS: {
      return update(state, {
        commentsChild: { $merge: getCommentsChildrenLists(action.state.content) },
        commentsData: { $merge: action.state.content },
      });
    }
    case VOTE_OPTIMISTIC: {
      const { content, accountName, weight, contentType } = action;
      if (contentType === 'comment') {
        const newComment = manageContentVote({ ...state.commentsData[getPostKey(content)] }, weight, accountName);
        newComment.isUpdating = true;
        return update(state, {
          commentsData: {
            [getPostKey(content)]: {$set:
              newComment,
            }
          }
        });
      } else {
        return state;
      }
    }
    case VOTE_FAILURE: {
      const { content, accountName, contentType } = action;
      if (contentType === 'comment') {
        return update(state, {
          commentsData: {
            [content.id]: {
              active_votes: {$apply: votes => {
                return votes.filter(vote => {
                  if (vote.voter !== accountName) {
                    return true;
                  }
                  return vote.percent <= 0;
                });
              }},
              net_votes: {$apply: count => count - 1},
              isUpdating: {$set: false},
            }
          },
        });
      } else {
        return state;
      }
    }
    case UPDATE_PAYOUT: {
      const { content, contentType, myAccount, weight } = action;
      if (contentType === 'comment') {

        const votedScore = getUserScore(myAccount) * getRoleBoost(myAccount) * weight / 10000;

        // Update score table
        const scores = Object.assign({}, state.commentsData[getPostKey(content)].scores);
        if (weight > 0) {
          scores.total += votedScore;
          scores.user_scores[myAccount.username] = votedScore;
        } else {
          scores.total -= scores.user_scores[myAccount.username];
          delete scores.user_scores[myAccount.username];
        }

        return update(state, {
          commentsData: {
            [getPostKey(content)]: {
              pending_payout_value: {$set: content.pending_payout_value},
              total_payout_value: {$set: content.total_payout_value},
              active_votes: {$set: content.active_votes},
              payout_value: {$set: calculateContentPayout(content)},
              isUpdating: {$set: false},
              scores: { $set: scores },
            }
          },
        });
      } else {
        return state;
      }
    }
    default:
      return state;
  }
}

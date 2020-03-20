import { put, select, takeLatest } from 'redux-saga/effects';
import update from 'immutability-helper';
import api from 'utils/api';
import { createPermlink } from 'utils/helpers/steemitHelpers';
import { selectMyAccount } from 'features/User/selectors';
import { selectDraft } from '../selectors';
import { notification } from 'antd';
import { getPostKey, getPostPath } from 'features/Post/utils';
import { getToken } from 'utils/token';
import { initialState } from '../actions';
import { extractErrorMessage } from 'utils/errorMessage';
import steem from 'steem';

/*--------- CONSTANTS ---------*/
const MAIN_CATEGORY = 'steemhunt';
const DEFAULT_BENEFICIARY = [
  { account: 'steemhunt', weight: 1000 },
];
const PARTNERED_BENEFICIARY = [
  { account: 'steemhunt', weight: 800 },
];

const PUBLISH_CONTENT_BEGIN = 'PUBLISH_CONTENT_BEGIN';
const PUBLISH_CONTENT_SUCCESS = 'PUBLISH_CONTENT_SUCCESS';
const PUBLISH_CONTENT_FAILURE = 'PUBLISH_CONTENT_FAILURE';

/*--------- ACTIONS ---------*/

export function publishContentBegin(props, editMode) {
  return { type: PUBLISH_CONTENT_BEGIN, props, editMode };
}

export function publishContentSuccess(post) {
  return { type: PUBLISH_CONTENT_SUCCESS, post };
}

export function publishContentFailure(message) {
  return { type: PUBLISH_CONTENT_FAILURE, message };
}

/*--------- REDUCER ---------*/
export function publishContentReducer(state, action) {
  switch (action.type) {
    case PUBLISH_CONTENT_BEGIN: {
      return update(state, {
        isPublishing: { $set: true },
      });
    }
    case PUBLISH_CONTENT_SUCCESS: {
      return update(state, {
        posts: { [getPostKey(action.post)]: { $set: action.post } },
        isPublishing: { $set: false },
      });
    }
    case PUBLISH_CONTENT_FAILURE: {
      return update(state, {
        isPublishing: { $set: false },
      });
    }
    default:
      return state;
  }
}

function getBody(post) {
  let screenshots;
  if (post.images[0] && post.images[0].link.match(/\.mp4$/)) {
    screenshots = `<center><img alt="${post.images[0].name}" src="${post.images[0].link.replace(/\.mp4$/, '-thumb.jpg')}"/></center>\n\n`;
  } else {
    screenshots = `<center><img alt="${post.images[0].name}" src="${post.images[0].link}"/></center>\n\n`;
  }
  let screenshots2 = '';
  let table = '';
  if (post.images.length > 1) {
    const otherImages = post.images.slice(1);
    screenshots += '|';
    table += '|';
    screenshots2 += '|';

    for (let i in otherImages) {
      if (!otherImages[i].link) {
        continue;
      }

      let column;
      if (otherImages[i].link.match(/\.mp4$/)) {
        column = ` <center><img alt="${otherImages[i].name}" src="${otherImages[i].link.replace(/\.mp4$/, '-thumb.jpg')}"/><br><a href="${otherImages[i].link}">View Video</a></center> |`;
      } else {
        column = ` <center><img alt="${otherImages[i].name}" src="${otherImages[i].link}"/><br><a href="${otherImages[i].link}">View Image</a></center> |`;
      }

      if (i < 5) {
        screenshots += column;
        table += ' - |';
      } else {
        screenshots2 += column;
        if ((i + 1) % 5 === 0 && i !== otherImages.length - 1) {
          screenshots2 += "\n| ";
        }
      }
    }
  }

  return `# ${post.title}\n` +
    `${post.tagline}\n` +
    `\n---\n` +
    `## Screenshots\n` +
    `${screenshots}\n` +
    `${table}\n` +
    `${screenshots2}\n` +
    `\n---\n` +
    `## Hunter's comment\n` +
    `${post.description}\n` +
    `\n---\n` +
    `## Link\n` +
    `${post.url}\n` +
    `\n---\n` +
    `<center>` +
    `<br/>![Steemhunt.com](https://i.imgur.com/jB2axnW.png)<br/>\n` +
    `This is posted on Steemhunt - A place where you can dig products and earn STEEM.\n` +
    `[View on Steemhunt.com](https://steemhunt.com/@${post.author}/${post.permlink})\n` +
    `</center>`;
}

/*--------- SAGAS ---------*/
function* publishContent({ props, editMode }) {
  const post = yield select(selectDraft());
  // console.log('1------', post);

  try {
    if (post.url === initialState.draft.url) {
      throw new Error("Please check errors on product link field.");
    }
    if (post.title === initialState.draft.title) {
      throw new Error("Product name can't be empty.");
    }
    if (post.tagline === initialState.draft.tagline) {
      throw new Error("Short description can't be empty.");
    }
    if (post.images.length < 1) {
      throw new Error("Please upload at least one image.");
    }

    const myAccount = yield select(selectMyAccount());
    if (myAccount.name !== post.author) {
      throw new Error("Please login before posting.");
    }

    const title = `${post.title} - ${post.tagline}`;

    let newPost;
    if (editMode) { // Edit
      newPost = yield api.put(`/posts${getPostPath(post)}.json`, { post: post }, true);
    } else { // Create
      post.permlink = yield createPermlink(title, post.author, '', '');
      newPost = yield api.post('/posts.json', { post: post }, true);
    }
    // console.log('2------', res);

    // Inject 'steemhunt' as a main category for every post
    const tags = [MAIN_CATEGORY].concat(newPost.tags);

    // Prepare data
    const metadata = {
      tags: tags,
      image: newPost.images.map((i) => {
        if (i.link.match(/\.mp4$/)) {
          return i.link.replace(/\.mp4$/, '-thumb.jpg');
        } else {
          return i.link;
        }
      }),
      links: [ newPost.url ],
      community: 'steemhunt',
      app: 'steemhunt/1.0.0',
    };

    let operations = [
      ['comment',
        {
          wif: getToken(),
          parent_author: '',
          parent_permlink: tags[0],
          author: newPost.author,
          permlink: newPost.permlink,
          title,
          body: getBody(newPost),
          json_metadata: JSON.stringify(metadata),
        },
      ]
    ];

    if (!editMode) { // only on create
      let beneficiaries = newPost.beneficiaries || [];

      // If our partner's beneficiary, take the cut from Steemhunt side, not users
      if (beneficiaries.some(b => b.account === 'steemplus-pay')) {
        beneficiaries = PARTNERED_BENEFICIARY.concat(beneficiaries);
      } else {
        beneficiaries = DEFAULT_BENEFICIARY.concat(beneficiaries);
      }

      beneficiaries = beneficiaries.sort(function(a, b) {
        if (a.account < b.account) {
          return -1;
        } else if (a.account > b.account) {
          return 1;
        } else {
          return 0;
        }
      });

      operations.push(['comment_options', {
        wif: getToken(),
        author: newPost.author,
        permlink: newPost.permlink,
        max_accepted_payout: '1000000.000 SBD',
        percent_steem_dollars: 10000,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [
          [0, {
            beneficiaries: beneficiaries
          }]
        ]
      }]);
    }
    // console.log('3-------------', operations);

    try {
      if (process.env.NODE_ENV === 'production') {
        yield steem.broadcast(operations);
      }
    } catch (e) {
      // Delete post on Steemhunt as transaction failed
      yield notification['error']({ message: extractErrorMessage(e) });

      if (!editMode) {
        yield api.delete(`/posts${getPostPath(newPost)}.json`, null, true);
      }
      throw e;
    }

    // Clear safeStorage
    window.safeStorage.removeItem('draft');
    yield put(publishContentSuccess(newPost));
    if (editMode) {
      yield notification['success']({ message: 'Your post has been successfully updated!' });
    } else {
      yield notification['success']({ message: 'Your post has been successfully published!' });
    }

    yield props.history.push(getPostPath(newPost)); // Redirect to #show
  } catch (e) {
    yield notification['error']({ message: extractErrorMessage(e) });
    yield put(publishContentFailure(e.message));
  }
}

export default function* publishContentManager() {
  yield takeLatest(PUBLISH_CONTENT_BEGIN, publishContent);
}

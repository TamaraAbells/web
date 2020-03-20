import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import isEmpty from 'lodash/isEmpty';
import { Helmet } from 'react-helmet';
import { List, Button, Icon } from 'antd';
import ContentPayoutAndVotes from 'components/ContentPayoutAndVotes';
import CommentItem from 'features/Comment/CommentItem';
import { getCommentsFromPostBegin } from 'features/Comment/actions/getCommentsFromPost';
import {
  selectCommentsChild,
  selectCommentsData,
  selectCommentsIsLoading
} from 'features/Comment/selectors';
import { getCachedImageHack } from 'features/Post/utils';
import { selectMe } from 'features/User/selectors';
import { selectCurrentComments, selectCurrentPost, selectIsPostLoading } from './selectors';
import { getPostBegin, setCurrentPostKey } from './actions/getPost';
import PostView from './components/PostView';
import CommentReplyForm from 'features/Comment/CommentReplyForm';
import { scrollTop } from 'utils/scroller';
import NotFound from 'components/NotFound';
import CircularProgress from 'components/CircularProgress';
import ResteemButton from './components/ResteemButton';
import { isPrerenderer } from 'utils/userAgent';
import { titleize } from 'utils/helpers/stringHelpers';
import removeMd from 'remove-markdown-and-html';

class Post extends Component {
  static propTypes = {
    getPost: PropTypes.func.isRequired,
    setCurrentPostKey: PropTypes.func.isRequired,
    getCommentsFromPost: PropTypes.func.isRequired,
    post: PropTypes.object,
    commentsData: PropTypes.object.isRequired,
    commentsChild: PropTypes.object.isRequired,
    currentComments: PropTypes.object,
    commentsIsLoading: PropTypes.bool.isRequired,
    isPostLoading: PropTypes.bool.isRequired,
  };

  strip(string) {
    return removeMd(string).replace('\n', '').substring(0, 300) + '...';
  }

  componentDidMount() {
    const { match: { params : { author, permlink }} } = this.props;
    this.props.getPost(author, permlink);
    if (!isPrerenderer()) {
      this.props.getCommentsFromPost('steemhunt', author, permlink);
    }

    scrollTop();
  }

  componentWillReceiveProps(nextProps) {
    const { match: { params : { author, permlink }} } = this.props;
    const nextAuthor = nextProps.match.params.author;
    const nextPermlink = nextProps.match.params.permlink;

    if (author !== nextAuthor || permlink !== nextPermlink) {
      this.props.getPost(nextAuthor, nextPermlink);
      scrollTop();

      if (nextProps.commentsIsLoading === false) {
        this.props.getCommentsFromPost('steemhunt', nextAuthor, nextPermlink);
      }
    }
  }

  componentWillUnmount() {
    this.props.setCurrentPostKey(null);
  }

  render() {
    const { me, post, currentComments, commentsData, commentsChild, commentsIsLoading, isPostLoading } = this.props;

    if (isPostLoading) {
      return <CircularProgress />;
    } else if (isEmpty(post)) {
      return <NotFound/>;
    }

    return (
      <div className="post-container" id="post-container">
        <Helmet>
          <title>{titleize(post.title)} - {post.tagline} | Steemhunt</title>

          { /* Search Engine */ }
          <meta name="description" content={this.strip(post.description)} />
          <meta name="image" content={getCachedImageHack(post.images[0]['link'], 1200, 630, true)} />
          { /* Schema.org for Google */ }
          <meta itemprop="name" content={`${titleize(post.title)} - ${post.tagline} | Steemhunt`} />
          <meta itemprop="description" content={this.strip(post.description)} />
          <meta itemprop="image" content={getCachedImageHack(post.images[0]['link'], 1200, 630, true)} />
          { /* Twitter */ }
          <meta name="twitter:title" content={`${titleize(post.title)} - ${post.tagline} | Steemhunt`} />
          <meta name="twitter:description" content={this.strip(post.description)} />
          <meta name="twitter:image:src" content={getCachedImageHack(post.images[0]['link'], 1200, 630, true)} />
          { /* Open Graph general (Facebook, Pinterest & Google+) */ }
          <meta property="og:title" content={`${titleize(post.title)} - ${post.tagline} | Steemhunt`} />
          <meta property="og:description" content={this.strip(post.description)} />
          <meta property="og:image" content={getCachedImageHack(post.images[0]['link'], 1200, 630, true)} />
          <meta property="og:url" content={`${process.env.PUBLIC_URL}/@${post.author}/${post.permlink}`} />
        </Helmet>

        { post && <PostView post={post} /> }

        <div className="comments">
          <hr />

          <h3>
            <ContentPayoutAndVotes content={post} type="post" />
            <span className="separator">&middot;</span>
            {commentsIsLoading ?
              <span><Icon type="loading" /> comments</span>
            :
              <span>{post.children} comments</span>
            }
            { me && me !== post.author && !this.props.draft &&
              <ResteemButton post={post} me={me} />
            }
          </h3>

          {!me && (
            <div className="post-signup">
              <p>You need a Steem account to join the discussion</p>
              <Button
                type="primary"
                href="/sign-up"
                onClick={() => window.gtag('event', 'signup_clicked', { 'event_category' : 'signup', 'event_label' : 'Post Footer' })}
              >
                Sign up now
              </Button>
              <a href="/sign-in" className="signin-link">
                Already have a Steem account?
              </a>
            </div>
          )}

          {me && (
            <CommentReplyForm content={post} closeForm={null} />
          )}

          {commentsIsLoading ?
            <Icon type="loading" spin="true" className="center-loading" style={{ fontSize: 40 }} />
          :
            <List
              loading={commentsIsLoading}
              itemLayout="horizontal"
              dataSource={currentComments  && currentComments.list}
              locale={{ emptyText: "No comments yet" }}
              renderItem={commentId => (
                <CommentItem
                  key={commentId}
                  post={post}
                  comment={commentsData[commentId]}
                  commentsData={commentsData}
                  commentsChild={commentsChild}
                />
              )}
            />
          }
        </div>
      </div>
    );
  }
}

const mapStateToProps = () => createStructuredSelector({
  me: selectMe(),
  post: selectCurrentPost(),
  commentsData: selectCommentsData(),
  commentsChild: selectCommentsChild(),
  currentComments: selectCurrentComments(),
  commentsIsLoading: selectCommentsIsLoading(),
  isPostLoading: selectIsPostLoading(),
});

const mapDispatchToProps = dispatch => ({
  getPost: (author, permlink) => dispatch(getPostBegin(author, permlink)),
  setCurrentPostKey: key => dispatch(setCurrentPostKey(key)),
  getCommentsFromPost: (category, author, permlink) => dispatch(getCommentsFromPostBegin(category, author, permlink)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Post);

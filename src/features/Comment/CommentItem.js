import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import Body from 'components/Body';
import { List, Avatar, Icon } from 'antd';
import { sortCommentsFromSteem } from 'utils/helpers/stateHelpers';
import ContentPayoutAndVotes from 'components/ContentPayoutAndVotes';
import Author from 'components/Author';
import CommentReplyForm from './CommentReplyForm';
import VoteButton from 'features/Vote/VoteButton';
import { toTimeAgo } from 'utils/date';
import { selectMe, selectMyAccount } from 'features/User/selectors';
import { isEditable } from 'features/Post/utils';
import { getRoleName, isModerator, getUserScore } from 'features/User/utils';
import { decreaseCommentcount } from 'features/Post/reducer';
import { shouldCommentVisible } from 'features/Comment/utils/comments';
import { updateComment } from 'features/Comment/actions/updateComment';
import { getPostKey } from 'features/Post/utils';
import api from 'utils/api';

class CommentItem extends PureComponent {
  static propTypes = {
    me: PropTypes.string.isRequired,
    post: PropTypes.object.isRequired,
    commentsData: PropTypes.object.isRequired,
    commentsChild: PropTypes.object.isRequired,
    decreaseCommentcount: PropTypes.func.isRequired,
    comment: PropTypes.object,
  };

  constructor() {
    super();
    this.state = {
      showReplyForm: false,
      showEditForm: false,
      loadingDislike: false
    };
  }

  componentDidMount() {
    const { post, comment } = this.props;

    // NOTE:
    // This will show an incorrect count when the user is the owner or a moderator
    // Hard to fix because getMe() and getCommentsFromPost() - are running asynchronously
    if (comment && isModerator(comment.author) && !post.commentCountAdjusted) {
      this.props.decreaseCommentcount();
    }
  }

  closeReplyForm = () => {
    this.setState({ showReplyForm: false });
  };

  switchReplyForm = () => {
    this.setState({ showReplyForm: !this.state.showReplyForm });
  };

  closeEditForm = () => {
    this.setState({ showEditForm: false });
  };

  switchEditForm = () => {
    this.setState({ showEditForm: !this.state.showEditForm });
  };

  onClickDislike = () => {
    const { comment } = this.props;
    this.setState({ loadingDislike: true }, async () => {
      const res = await api.post(`/comments/dislike.json`, {
        key: comment.post_id,
        author: comment.author,
        permlink: comment.permlink
      }, true);

      this.props.updateComment(getPostKey(comment), res);
      this.setState({ loadingDislike: false });
    });
  }

  dislikeButton() {
    const { me, myAccount, comment } = this.props;

    if (getUserScore(myAccount) < 2 || me === comment.author) {
      return;
    }

    if(this.state.loadingDislike) {
      return <Icon className={"dislike-button loading"} type="loading" spin="true" />;
    }

    return (
      <Icon className={`dislike-button${comment.is_disliked ? ' disliked' : ''}`} type="dislike" theme="outlined" onClick={this.onClickDislike}/>
    );
  }

  render() {
    const { post, comment, commentsChild, commentsData, me } = this.props;
    const { showReplyForm, showEditForm } = this.state;

    // Hide moderators' comments to normal users
    if (!comment || !shouldCommentVisible(comment, post.author, me)) {
      return null;
    }
    const isDelisted = ((!isModerator(comment.author) && (comment.net_rshares < 0 || comment.author_reputation < 0)) || comment.is_delisted)
    const roleName = getRoleName(comment.author);

    return (
      <List.Item className={`comment${isDelisted ? ' flagged' : ''}`}>
        <List.Item.Meta
          avatar={<Avatar src={`${process.env.REACT_APP_STEEMCONNECT_IMG_HOST}/@${comment.author}?s=64`} />}
          title={
            <div className="comment-title">
              {this.dislikeButton()}
              <Author name={comment.author} />
              {roleName !== 'User' && <span className={`badge ${roleName.toLowerCase().replace(' ', '-')}`}>{roleName.toUpperCase()}</span>}
              <span className="separator">&middot;</span>
              <span className="date">{toTimeAgo(comment.created)}</span>
            </div>
          }
          description={
            <div className="comment-body">
              {showEditForm ?
                <CommentReplyForm content={comment} editMode={true} closeForm={this.closeEditForm} />
              :
                <div>
                  <Body post={comment} />
                  <div className="actions">
                    <VoteButton post={comment} type="comment" layout="comment" />
                    <ContentPayoutAndVotes content={comment} type="comment" />
                    <span className="separator">|</span>
                    <span className="hover-link fake-link" onClick={this.switchReplyForm}>reply</span>
                    {me === comment.author && isEditable(comment) &&
                      <span>
                        <span className="separator">|</span>
                        <span className="hover-link fake-link" onClick={this.switchEditForm}>edit</span>
                      </span>
                    }
                  </div>
                </div>
              }

              {showReplyForm && (
                <CommentReplyForm content={comment} closeForm={this.closeReplyForm} />
              )}

              {commentsChild[getPostKey(comment)] &&
                sortCommentsFromSteem(commentsChild[getPostKey(comment)], commentsData, 'score').map(commentKey =>
                  <CommentItem
                    {...this.props}
                    key={commentKey}
                    comment={commentsData[commentKey]}
                  />
                )
              }
            </div>
          }
        />
      </List.Item>
    );
  }
}

const mapStateToProps = () => createStructuredSelector({
  me: selectMe(),
  myAccount: selectMyAccount()
});

const mapDispatchToProps = (dispatch, props) => ({
  decreaseCommentcount: () => dispatch(decreaseCommentcount(props.post)),
  updateComment: (commentKey, attributes) => dispatch(updateComment(commentKey, attributes)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CommentItem);
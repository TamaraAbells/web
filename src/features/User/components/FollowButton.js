import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { Button, notification } from 'antd';
import { selectMe, selectMyFollowingsList, selectMyFollowingsLoadStatus, selectIsLoading } from '../selectors';
import { followBegin } from '../actions/follow';
import { unfollowBegin } from '../actions/unfollow';

class FollowButton extends PureComponent {
  static propTypes = {
    accountName: PropTypes.string.isRequired,
    me: PropTypes.string.isRequired,
    followingsList: PropTypes.array.isRequired,
    followingLoadStatus: PropTypes.object.isRequired,
    follow: PropTypes.func.isRequired,
    unfollow: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
  };

  openSignin = () => {
    notification.open({
      message: 'Login Required',
      description:
        <div>
          Please <a href="/sign-in">Login</a>
          &nbsp;or&nbsp;
          <a
            href="/sign-up"
            onClick={() => window.gtag('event', 'signup_clicked', { 'event_category' : 'signup', 'event_label' : 'Follow Notification' })}
          >
            Sign Up
          </a> to follow a hunter.
        </div>,
    });
  };

  render() {
    const { followingsList, followingLoadStatus, accountName, me, unfollow, follow } = this.props;
    const isFollowing = followingsList.find(following => following.following === accountName);
    const isLoading = this.props.isLoading || followingLoadStatus[accountName];

    return me ? (
      <Button
        type="primary"
        className="round-border inversed-color padded-button checkitout-button follow-button"
        onClick={isFollowing ? unfollow : follow}
        disabled={accountName === me || isLoading}
        loading={isLoading}
      >
        {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
      </Button>
    ) : (
      <Button
        onClick={this.openSignin}
        type="primary"
        className="round-border inversed-color padded-button checkitout-button follow-button"
        loading={isLoading}
      >
        {isLoading ? 'LOADING..' : 'FOLLOW'}
      </Button>
    )
  }
}

const mapStateToProps = (state, props) => createStructuredSelector({
  isLoading: selectIsLoading(),
  followingLoadStatus: selectMyFollowingsLoadStatus(),
  followingsList: selectMyFollowingsList(),
  me: selectMe(),
});

const mapDispatchToProps = (dispatch, props) => ({
  follow: () => dispatch(followBegin(props.accountName)),
  unfollow: () => dispatch(unfollowBegin(props.accountName)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FollowButton);

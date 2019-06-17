import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { Spin, Select } from 'antd';
import InfiniteScroll from 'components/InfiniteScroll';
import { selectCurrentUser } from 'features/User/selectors';
import { selectAuthorStatus, selectAuthorPosts, selectPosts } from 'features/Post/selectors';
import { getPostsByAuthorBegin } from 'features/Post/actions/getPostsByAuthor';
import { setCurrentUserBegin } from 'features/User/actions/setCurrentUser';
import PostItem from 'features/Post/components/PostItem';
import { formatAmount } from "utils/helpers/steemitHelpers";
import { getSortOption, setSortOption } from 'utils/sortOptions';

class HuntedListByAuthor extends Component {
  static propTypes = {
    currentUser: PropTypes.string,
    authorStatus: PropTypes.object.isRequired,
    posts: PropTypes.object.isRequired,
    authorPosts: PropTypes.object.isRequired,
    getPostsByAuthor: PropTypes.func.isRequired,
    setCurrentUser: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const { match } = this.props;

    this.props.setCurrentUser(match.params.author);
    this.props.getPostsByAuthor(match.params.author, 1);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.match.params.author !== nextProps.currentUser) {
      this.props.setCurrentUser(nextProps.match.params.author);
      this.props.getPostsByAuthor(nextProps.match.params.author, 1);
    }
  }

  loadMore = (nextPage) => {
    this.props.getPostsByAuthor(this.props.currentUser, nextPage);
  };

  handleSortOption = (value) => {
    setSortOption('profile', value);
    this.props.getPostsByAuthor(this.props.currentUser, 1);
  };

  render() {
    const { authorStatus, currentUser, authorPosts, posts } = this.props;

    const items = (authorPosts[currentUser] || []).map((key, index) =>
      <PostItem key={index + 1} rank={index + 1} post={posts[key]} pathPrefix="/author" lazyLoad={false} />
    )

    let hasMore = false;
    let isLoading = false;
    if (authorStatus[currentUser]) {
      if (!authorStatus[currentUser]['finished'] && !authorStatus[currentUser]['error']) {
        hasMore = true;
      }

      if (authorStatus[currentUser]['loading']) {
        isLoading = true;
      }

      if (authorStatus[currentUser]['error']) {
        return (
          <div className="heading left-padded right-padded">
            Service is temporarily unavailable, Please try again later.
          </div>
        );
      }
    }

    return (
      <InfiniteScroll
        loadMore={this.loadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        loader={<Spin className="center-loading" key={0} />}
        useWindow={false}
        className="post-list"
        header={authorStatus[currentUser] &&
          <div className="heading left-padded" key="header">
            <h3>Hunted by @{currentUser}</h3>
            <div className="heading-sub">
              <b>{authorStatus[currentUser].total_count}</b> products, <b>{formatAmount(authorStatus[currentUser].total_payout)}</b> SBD hunter’s rewards were generated.
            </div>
            <div className="sort-option">
              <span className="text-small">Sort by: </span>
              <Select size="small" defaultValue={getSortOption('profile')} onChange={this.handleSortOption}>
                <Select.Option value="created">New</Select.Option>
                <Select.Option value="hunt_score">Hunt Score</Select.Option>
                <Select.Option value="payout">Payout Value</Select.Option>
                <Select.Option value="vote_count">Vote Count</Select.Option>
                <Select.Option value="comment_count">Comment Count</Select.Option>
              </Select>
            </div>
          </div>
        }
      >
        {items}
      </InfiniteScroll>
    );
  }
}

const mapStateToProps = () => createStructuredSelector({
  currentUser: selectCurrentUser(),
  authorStatus: selectAuthorStatus(),
  posts: selectPosts(),
  authorPosts: selectAuthorPosts(),
});


const mapDispatchToProps = dispatch => ({
  getPostsByAuthor: (author, page) => dispatch(getPostsByAuthorBegin(author, page)),
  setCurrentUser: user => dispatch(setCurrentUserBegin(user)),
});

export default connect(mapStateToProps, mapDispatchToProps)(HuntedListByAuthor);

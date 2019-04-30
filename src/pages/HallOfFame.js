import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Spin, Radio, Tag } from 'antd';
import InfiniteScroll from 'components/InfiniteScroll';
import { selectTopStatus, selectTopPosts, selectPosts } from 'features/Post/selectors';
import { getTopPostsBegin } from 'features/Post/actions/getTopPosts';
import PostItem from 'features/Post/components/PostItem';
import { formatAmount, formatNumber } from "utils/helpers/steemitHelpers";
import queryString from 'query-string';
import { getTagPath } from 'features/Post/utils';

class HallOfFame extends Component {
  static propTypes = {
    posts: PropTypes.object.isRequired,
    topPosts: PropTypes.object.isRequired,
    topStatus: PropTypes.object.isRequired,
    getTopPosts: PropTypes.func.isRequired,
  };

  state = {
    period: 'week',
    tags: '',
  };


  componentDidMount() {
    const parsedParams = queryString.parse(this.props.location.search);
    if(parsedParams.tags) {
      this.setState({ tags: parsedParams.tags });
    }

    this.props.getTopPosts(this.state.period, parsedParams.tags ? parsedParams.tags : '', 1);
  }

  loadMore = (nextPage) => {
     // NOTE: Disable pagination for Hall of Fame
    // this.props.getTopPosts(this.state.period, this.state.tags, nextPage);
  };

  handlePeriodChanged = (e) => this.setState({ period: e.target.value },  () => this.props.getTopPosts(this.state.period, this.state.tags, 1));

  render() {
    const { posts, topPosts, topStatus, location } = this.props;
    const { period, tags } = this.state;

    const items = (topPosts[period] || []).map((key, index) =>
      <PostItem key={index + 1} rank={index + 1} pathPrefix="/hall-of-fame" query={tags ? location.search : null} post={posts[key]} lazyLoad={false} />
    )

    let hasMore = false; // NOTE: Disable pagination for Hall of Fame
    let isLoading = false;
    if (topStatus[period]) {
      if (topStatus[period]['finished']) {
        hasMore = false;
      }

      if (topStatus[period]['loading']) {
        isLoading = true;
      }
    }

    const tagLinks = tags && tags.split(',').map((tag, index) => {
      return (
        <Tag key={index}><Link to={getTagPath(tag)}>{tag}</Link></Tag>
      );
    });

    return (
      <InfiniteScroll
        loadMore={this.loadMore}
        hasMore={hasMore}
        isLoading={isLoading}
        loader={<Spin className="center-loading" key={0} />}
        useWindow={false}
        className="post-list"
        header={topStatus[period] &&
          <div className="heading left-padded" key="header">
            <h3>Hall of Fame</h3>
            <div className="radio-option">
              <Radio.Group onChange={this.handlePeriodChanged} defaultValue={period} size="small">
                <Radio.Button value="week">Last Week</Radio.Button>
                <Radio.Button value="month">Last Month</Radio.Button>
                <Radio.Button value="all">All Time</Radio.Button>
              </Radio.Group><br/>
            </div>
            <div className="heading-sub">
              <b>{formatNumber(topStatus[period].total_count, '0,0')}</b> products, <b>{formatAmount(topStatus[period].total_payout)}</b> SBD hunter’s rewards were generated.
              {tags &&
                <div className="filter">
                  Filtered by: {tagLinks}
                </div>
              }
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
  posts: selectPosts(),
  topPosts: selectTopPosts(),
  topStatus: selectTopStatus(),
});


const mapDispatchToProps = dispatch => ({
  getTopPosts: (period, tags, page) => dispatch(getTopPostsBegin(period, tags, page)),
});

export default connect(mapStateToProps, mapDispatchToProps)(HallOfFame);

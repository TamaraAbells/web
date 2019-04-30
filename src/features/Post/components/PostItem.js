import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Link } from 'react-router-dom';
import { Icon } from 'antd';
import LazyLoad from 'react-lazyload';
import { selectMe } from 'features/User/selectors';
import { getPostPath, getCachedImage, hasBoosted } from 'features/Post/utils';
import { isModerator } from 'features/User/utils';
import VoteButton from 'features/Vote/VoteButton';
import { formatAmount } from 'utils/helpers/steemitHelpers';
import { titleize } from 'utils/helpers/stringHelpers';
import parrot from 'assets/images/parrot.gif';

class PostItem extends Component {
  static propTypes = {
    pathPrefix: PropTypes.string,
    query: PropTypes.string,
    rank: PropTypes.number.isRequired,
    post: PropTypes.object.isRequired,
    lazyLoad: PropTypes.bool.isRequired,
  };

  render() {
    const { me, rank, post, pathPrefix, query, lazyLoad } = this.props;
    // const activeVotes = post.active_votes.filter(v => v.percent !== 0).length;
    let image;

    if (/\.mp4$/.test(post.images[0].link)) {
      image = (
        <div className="thumbnail">
          <video alt={post.title} playsInline autoPlay muted loop>
            <source src={getCachedImage(post.images[0].link, 240, 240)} />
          </video>
        </div>
      )
    } else {
      image = <img src={post.images && getCachedImage(post.images[0].link, 240, 240)} alt={post.title} className="thumbnail"/>
    }

    return (
      <div className={`post${rank === 1 ? ' top-border' : ''}${post.is_active ? '' : ' faded'}`}>
        <div className="rank">{rank}</div>
        <Link to={getPostPath(post, pathPrefix, query)}>
          {lazyLoad ?
            <LazyLoad height={0} offset={500} once={true} scroll={false} overflow={true}>{image}</LazyLoad>
          :
            image
          }
        </Link>
        <div className="summary">
          <div className="title">
            <Link to={getPostPath(post, pathPrefix, query)}>
              {titleize(post.title)}
              {hasBoosted(post) && <img src={parrot} alt="I ♥ HUNT" title="I ♥ HUNT" className="party" />}
            </Link>
            {isModerator(me) &&
              (post.is_verified ?
                <Icon type="check-circle" className="verified"/>
              :
                (post.verified_by &&
                  <Icon type="loading" className="verified"/>
                )
              )
            }
          </div>
          <div className="tagline">{post.tagline}</div>
          <div className="stats">
            <span className="payout">{formatAmount(post.payout_value || 0)}</span>
            <span className="spacer">&middot;</span>
            <Icon type="up" />&nbsp;
            <span alt="Valid voting count">{post.valid_votes ? post.valid_votes.length : 0}</span>
            <span className="spacer">&middot;</span>
            <Icon type="message" />&nbsp;
            {post.children}
          </div>
        </div>
        <div className="vote-section">
          <VoteButton post={post} type="post" layout="list" />
        </div>
      </div>
    )
  }
}

const mapStateToProps = () => createStructuredSelector({
  me: selectMe(),
});

export default connect(mapStateToProps)(PostItem);

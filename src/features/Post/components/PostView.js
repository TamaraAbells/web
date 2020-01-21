import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Button, Carousel, Icon, Tag, Modal, Input, Row, Col, Tooltip, Popconfirm } from 'antd';
import { Link, withRouter } from 'react-router-dom';
import isEmpty from 'lodash/isEmpty';
import { getPostPath, getTagPath, isEditable, addReferral, getPostKey } from '../utils';
import VoteButton from 'features/Vote/VoteButton';
import Author from 'components/Author';
import { selectMe } from 'features/User/selectors';
import { getHtml } from 'components/Body';
import { shortFormat } from 'utils/date';
import moment from 'moment';
import { isModerator, isAdmin, isCommunityManager } from 'features/User/utils';
import { setModeratorBegin, moderatePostBegin } from 'features/Post/actions/moderatePost';
import { replyBegin } from 'features/Comment/actions/reply';
import { selectIsCommentPublishing, selectHasCommentSucceeded } from 'features/Comment/selectors';
import { getCachedImage, hasBoosted } from 'features/Post/utils';
import ShareButton from './ShareButton';
import { titleize } from 'utils/helpers/stringHelpers';
import parrot from 'assets/images/parrot.gif';
import playPoki from 'assets/images/play-poki.svg';

class PostView extends Component {
  static propTypes = {
    post: PropTypes.shape({
      url: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      tagline: PropTypes.string.isRequired,
      tags: PropTypes.arrayOf(PropTypes.string).isRequired,
      images: PropTypes.arrayOf(PropTypes.object).isRequired,
      author: PropTypes.string,
      active_votes: PropTypes.arrayOf(PropTypes.object),
      payout_value: PropTypes.number.isRequired,
      children: PropTypes.number.isRequired,
      is_active: PropTypes.bool.isRequired,
      is_verified: PropTypes.bool.isRequired,
      verified_by: PropTypes.string,
      beneficiaries: PropTypes.arrayOf(PropTypes.shape({
        account: PropTypes.string.isRequired,
        weight: PropTypes.number.isRequired,
      })),
    }).isRequired,
    author: PropTypes.string,
    permlink: PropTypes.string,
    me: PropTypes.string.isRequired,
    isCommentPublishing: PropTypes.bool.isRequired,
    hasCommentSucceeded: PropTypes.bool.isRequired,
    setModerator: PropTypes.func.isRequired,
    moderatePost: PropTypes.func.isRequired,
    moderatorReply: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      previewImage: '',
      previewVisible: false,
      moderationVisible: false,
      moderationComment: "Your comment here\n\n---\n\n" +
        "Please read our [posting guidelines](https://github.com/Steemhunt/web/blob/master/POSTING_GUIDELINES.md).\n" +
        "Connect with Steemhunt\n" +
        "* [Discord Group](https://discord.gg/mWXpgks)\n" +
        "* [Telegram Chat](https://t.me/steemhunt)\n" +
        "* [Twitter](https://twitter.com/steemhunt)\n",
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.post.verified_by !== this.props.me) {
      this.setState({ moderationVisible: false });
    }

    if (nextProps.hasCommentSucceeded &&
      this.props.hasCommentSucceeded !== nextProps.hasCommentSucceeded &&
      !isEmpty(this.state.moderationComment)) {
      this.setState({ moderationComment: '' });
      this.hideModeration();
    }
  }

  // MARK: - Handle modals

  hideModal = () => this.setState({ previewVisible: false });
  showModal = (e, src = null) => {
    this.setState({
      previewImage: src || e.target.src,
      previewVisible: true,
    });
  };
  hideModeration = () => this.setState({ moderationVisible: false });
  showModeration = () => {
    this.setState({ moderationVisible: true });
    this.props.setModerator();
  };

  changePreview = (diff) => {
    const images = this.props.post.images;

    for (let i in images) {
      if (getCachedImage(images[i].link) === this.state.previewImage) {
        let newIndex = parseInt(i, 10) + diff;
        if (newIndex < 0) {
          newIndex = images.length + newIndex;
        }
        if (newIndex >= images.length) {
          newIndex = newIndex - images.length;
        }

        return this.setState({ previewImage: getCachedImage(images[newIndex].link) });
      }
    }
  };

  handleModerationCommentChange = (e) => this.setState({ moderationComment: e.target.value });
  commentModeration = () => {
      const comment = this.state.moderationComment.trim();
      if (comment) {
        this.props.moderatorReply(comment);
      }
  };

  checkDraft() {
    const { post } = this.props;
    const draftString = window.safeStorage.getItem('draft');
    if (!draftString) {
      this.props.history.push(`${getPostPath(post)}/edit`);
    }
  }

  onClickForceEdit() {
    const { post } = this.props;
    this.props.history.push(`${getPostPath(post)}/edit`);
  }

  render() {
    const { me, post } = this.props;

    const images = post.images.map((image, index) => {
      if (/\.mp4$/.test(image.name)) {
        return (
          <div key={`${post.id}-${index}`} className="slide-container">
            <video alt={image.name} playsInline autoPlay="autoplay" muted loop onClick={(e) => this.showModal(e, getCachedImage(image.link))} >
              <source src={getCachedImage(image.link)} />
            </video>
          </div>
        );
      } else {
        return (
          <div key={`${post.id}-${index}`} className="slide-container">
            <img alt={image.name} src={getCachedImage(image.link)} onClick={this.showModal} />
          </div>
        );
      }
    });
    const tags = post.tags.map((tag, index) => {
      return (
        <Tag key={index}><Link to={getTagPath(tag)}>{tag}</Link></Tag>
      );
    });

    const shouldShowEdit = window.location.pathname !== '/post' && me === post.author && isEditable(post);

    let reviewButtonText = 'Start Review';

    if (post.is_active && post.is_verified) {
      reviewButtonText = 'Verified';
    } else if (!post.is_active && post.is_verified) {
      reviewButtonText = 'Hidden';
    } else if (!post.is_active && !post.is_verified) {
      reviewButtonText = 'Pending Edit';
    } else if (post.verified_by === me && !post.is_verified) {
      reviewButtonText = 'In Review';
    }

    // a & v => verified => unverify
    // !a & v => hidden => unhide
    // !a & !v => pending edit => hide, approve
    // a & !v => initial => hide, request for edit, approve

    const buttonHide = (
      <Button
        icon="delete"
        type="danger"
        loading={this.props.isModerating}
        onClick={() => this.props.moderatePost(false, true)}
      >
        Hide
      </Button>
    );

    const buttonRequestEdit = (
      <Button
        icon="clock-circle-o"
        loading={this.props.isModerating}
        onClick={() => this.props.moderatePost(false, false)}
      >
        Request for Edit
      </Button>
    );

    const buttonApprove = (
      <Button
        icon="check-circle"
        type="primary"
        loading={this.props.isModerating}
        onClick={() => this.props.moderatePost(true, true)}
      >
        Approve
      </Button>
    );

    const buttonUnhide = (
      <Button
        icon="sync"
        type="primary"
        loading={this.props.isModerating}
        onClick={() => this.props.moderatePost(true, true)}
      >
        Unhide
      </Button>
    );

    const buttonUnverify = (
      <Button
        icon="sync"
        type="danger"
        loading={this.props.isModerating}
        onClick={() => this.props.moderatePost(true, false)}
      >
        Unverify
      </Button>
    );

    // Partnership with Poki web game platform
    const isPokiURL = !!post.url.match(/https?:\/\/poki\.com\/.+/);

    return (
      <div className="post-view diagonal-split-view">
        <div className="top-container primary-gradient">
          <Tooltip title={`Posted on ${moment(post.created_at).format('YYYY-MM-DD HH:mmZ')}`}>
            <span className="featured-date round-border" data-id={post.id}>Featured on {shortFormat(post.listed_at)}</span>
          </Tooltip>

          <div className="edit-buttons">
            {shouldShowEdit &&
              <Popconfirm placement="bottomRight" title={`Your saved local post draft will be deleted. Are you sure?`} onConfirm={() => this.onClickForceEdit()} okText="Yes" cancelText="No">
                <Button onClick={() => this.checkDraft()} icon="edit" size="small" ghost>Edit</Button>
              </Popconfirm>
            }
            {isModerator(me) &&
              <span>
                {(post.verified_by === me || post.verified_by === null || isAdmin(me) || isCommunityManager(me)) ?
                    (post.author === me ?
                      <Button icon="check-circle" size="small" ghost disabled>
                        Own Content
                      </Button>
                    :
                      <Button icon={post.verified_by && !post.is_verified ? 'loading' : 'check-circle'} size="small" onClick={this.showModeration} ghost>
                        {reviewButtonText}
                        {post.verified_by &&
                          <span> (@{post.verified_by})</span>
                        }
                      </Button>
                    )
                  :
                    (post.is_verified ?
                      <Button icon="check-circle" size="small" ghost disabled>
                        <span>Reviewed by @{post.verified_by}</span>
                      </Button>
                    :
                      <Button loading={true} size="small" ghost disabled>
                        <span>In review by @{post.verified_by}</span>
                      </Button>
                    )
                }
              </span>
            }
          </div>

          <div className="party-container">
            {hasBoosted(post) && <img src={parrot} alt="I ♥ HUNT" title="I ♥ HUNT" className="party big" /> }
          </div>

          <h1>
            {titleize(post.title)}
          </h1>
          <h2>{post.tagline}</h2>
          <Button
            href={addReferral(post.url)}
            type="primary"
            className="round-border inversed-color padded-button checkitout-button"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => window.gtag('event', 'check_it_out_clicked', { 'event_category' : 'lead', 'event_label' : getPostKey(post) })}
          >
            CHECK IT OUT
          </Button>
        </div>
        <div className="diagonal-line"></div>
        <div className="bottom-container">
          {post.images.length === 0 ?
            <Carousel key={`carousel-${post.id}`} className="carousel" effect="fade">
              <div><Icon type="camera-o" /></div>
            </Carousel>
          :
            <Carousel key={`carousel-${post.id}`} className="carousel" autoplay={true} effect="scrollx">
              {images}
            </Carousel>
          }

          <div className="description">
            {post.description && getHtml(post.description)}
          </div>

          {post.author &&
            <div className="hunter">
              Hunted by <Author name={post.author} />
            </div>
          }

          <div className="vote-container">
            <VoteButton post={post} type="post" layout="detail-page" />
            {!this.props.draft && <ShareButton post={post} me={me} />}
          </div>

          <div className="tags">
            {tags}
          </div>

          {isPokiURL &&
            <a
              href={addReferral(post.url)}
              type="primary"
              className="poki-button"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => window.gtag('event', 'check_it_out_clicked', { 'event_category' : 'lead', 'event_label' : getPostKey(post) })}
            >
              <img src={playPoki} alt="Play on Poki"/>
            </a>
          }
        </div>
        <Modal visible={this.state.previewVisible} footer={null} onCancel={this.hideModal} className="preview-modal" centered>
          {
            /\.mp4$/.test(this.state.previewImage) ?
            <video key={this.state.previewImage} alt="Preview" playsInline autoPlay="autoplay" muted loop>
              <source src={this.state.previewImage} />
            </video> :
            <img key={this.state.previewImage} alt="Preview" src={this.state.previewImage} />
          }
          {post.images.length > 1 &&
            <div className="prev" onClick={() => this.changePreview(-1)}>
              <Icon type="left" />
            </div>
          }
          {post.images.length > 1 &&
            <div className="next" onClick={() => this.changePreview(1)}>
              <Icon type="right" />
            </div>
          }
        </Modal>
        {isModerator(me) &&
          <Modal className="moderation-modal" visible={this.state.moderationVisible} footer={null} onCancel={this.hideModeration}>
            <Row>
              <Col span={24}>Moderation Comment:</Col>
            </Row>
            <Row className="top-margin">
              <Col span={17}>
                <Input.TextArea
                  placeholder="You must leave a comment to receive the moderator’s upvoting."
                  value={this.state.moderationComment}
                  onChange={this.handleModerationCommentChange}
                  autosize={{ minRows: 4 }}
                />
              </Col>
              <Col span={7}>
                <Button
                  icon="message"
                  loading={this.props.isCommentPublishing}
                  onClick={this.commentModeration}
                  className="comment-button"
                >
                  Comment
                </Button>
              </Col>
            </Row>
            <Row className="buttons">
              {post.is_active && !post.is_verified && // initial status
                <Col span={24}>
                  {buttonHide}
                  {buttonRequestEdit}
                  {buttonApprove}
                </Col>
              }

              {!post.is_active && !post.is_verified && // pending edit status
                <Col span={24}>
                  {buttonHide}
                  {buttonApprove}
                </Col>
              }

              {!post.is_active && post.is_verified && // hidden status
                <Col span={24}>
                  {buttonUnhide}
                </Col>
              }

              {post.is_active && post.is_verified && // verified status
                <Col span={24}>
                  {buttonUnverify}
                </Col>
              }
            </Row>
          </Modal>
        }
      </div>
    )
  }
}

const mapStateToProps = () => createStructuredSelector({
  me: selectMe(),
  isCommentPublishing: selectIsCommentPublishing(),
  hasCommentSucceeded: selectHasCommentSucceeded(),
});

const mapDispatchToProps = (dispatch, props) => ({
  setModerator: () => dispatch(setModeratorBegin(props.post)),
  moderatePost: (is_active, is_verified, comment) => dispatch(moderatePostBegin(props.post, is_active, is_verified, comment)),
  moderatorReply: (body) => dispatch(replyBegin(props.post, body, true)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(PostView));

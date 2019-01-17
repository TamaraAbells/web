import React, { Component } from 'react';
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { getLoginURL } from 'utils/token';
import { Popover, Button, Spin, Input, Avatar } from 'antd';
import {
  selectMe,
  selectMyAccount,
  selectIsLoading,
  selectMyFollowingsLoadStatus,
  selectMyFollowingsList,
} from 'features/User/selectors';
import { selectSearchTerm } from 'features/Post/selectors';
import { getFollowingsBegin } from 'features/User/actions/getFollowings';
import { followBegin } from 'features/User/actions/follow';
import { logoutBegin } from 'features/User/actions/logout';
import { setSearchTerm } from 'features/Post/actions/searchPost';
import logo from 'assets/images/logo-nav-pink@2x.png'
import MenuContent from './MenuContent';

class Header extends Component {
  static propTypes = {
    me: PropTypes.string.isRequired,
    isLoading: PropTypes.bool,
    myAccount: PropTypes.object.isRequired,
    myFollowingsLoadStatus: PropTypes.object.isRequired,
    myFollowingsList: PropTypes.array.isRequired,
    follow: PropTypes.func.isRequired,
    logout: PropTypes.func.isRequired,
    getFollowings: PropTypes.func.isRequired,
    setSearchTerm: PropTypes.func.isRequired,
  };

  state = {
    menuVisible: false,
    searchVisible: false,
  };

  componentWillReceiveProps(nextProps) {
    if (this.props.me !== nextProps.me) {
      this.props.getFollowings(nextProps.me);
    }
  }

  changeVisibility = (visible) => this.setState({ menuVisible: visible });

  setSearchVisible = (bool) => {
    this.setState({ searchVisible: bool }, () => {
      if (bool && this.searchInput) {
        this.searchInput.focus();
      }
    });
  };

  handleSearch = (e) => this.props.setSearchTerm(e.target.value);

  resetSearch() {
    this.props.setSearchTerm(null);
    this.setSearchVisible(false);
  }

  handleKeyPress = (e) => {
    if (e.keyCode === 27) { // ESC
      this.resetSearch();
    }
  };

  render() {
    const { me, myAccount, myFollowingsList, myFollowingsLoadStatus, isLoading, follow, searchTerm } = this.props;
    let isFollowing = true;
    if (myFollowingsList && myFollowingsList.length > 0) {
      isFollowing = myFollowingsList.find(following => following && following.following === 'steemhunt');
    }
    const searchBarHidden = (this.props.path === '/wallet' || this.props.path === '/post');
    const menu = (
      <MenuContent
        me={me}
        follow={follow}
        isFollowing={isFollowing}
        isFollowLoading={isLoading || myFollowingsLoadStatus['steemhunt']}
        myAccount={myAccount}
        changeVisibility={this.changeVisibility}
        logout={this.props.logout}
      />
    );

    return (
      <header>
        <Link to="/">
          <img src={logo} alt="logo" className="nav-logo"/>
        </Link>

        {isLoading &&
          <div className="pull-right">
            <Spin size="large" className="header-button smaller avatar-container" />
          </div>
        }

        {!isLoading && me &&
          <div className="pull-right">
            <Link to="/post" className="right-margin header-button smaller">
              <Button shape="circle" icon="plus" />
            </Link>
            <Popover
              content={menu}
              trigger="click"
              placement="bottomRight"
              visible={this.state.menuVisible}
              onVisibleChange={this.changeVisibility}
              overlayClassName="menu-popover"
            >
              <span className="ant-dropdown-link header-button avatar-container" role="button">
                <Avatar
                  src={`${process.env.REACT_APP_STEEMCONNECT_IMG_HOST}/@${me}?s=80`}
                  size="large"
                  className="avatar-steemit"
                />
              </span>
            </Popover>
          </div>
        }

        {!isLoading && !me &&
          <div className="pull-right">
            <a href={getLoginURL('/post')} className="right-margin header-button smaller mobile-hidden">
              <Button shape="circle" icon="plus" />
            </a>
            <Popover
              content={menu}
              trigger="click"
              placement="bottom"
              visible={this.state.menuVisible}
              onVisibleChange={this.changeVisibility}
              overlayClassName="menu-popover"
            >
              <span className="right-margin header-button smaller">
                <Button shape="circle" icon="ellipsis" />
              </span>
            </Popover>

            <Button type="primary" href={getLoginURL()} ghost className="right-margin header-button smaller">Login</Button>
            <Button
              type="primary"
              href="/sign-up"
              onClick={() => window.gtag('event', 'signup_clicked', { 'event_category' : 'signup', 'event_label' : 'Header Button' })}
              className="header-button smaller"
            >
              Sign Up
            </Button>
          </div>
        }

        <div className="pull-right">
          {!searchBarHidden &&
            <Input.Search
              ref={node => this.searchInput = node}
              value={searchTerm}
              placeholder="Search products"
              onSearch={value => this.props.setSearchTerm(value)}
              onChange={this.handleSearch}
              onKeyDown={this.handleKeyPress}
              onBlur={() => this.setSearchVisible(false)}
              maxLength={40}
              className={`header-button smaller one-column-hidden right-margin${this.state.searchVisible ? ' active' : ''}`}
            />
          }
          <Button
            shape="circle"
            icon="search"
            className="header-button smaller right-margin two-column-hidden"
            onClick={() => this.setSearchVisible(true)}
          />

          <Link to="/about" className="header-button smaller right-margin two-column-hidden mobile-hidden">
            <Button shape="circle" icon="question" style={{ fontSize: '21px' }} />
          </Link>
        </div>
      </header>
    )
  }
}

const mapStateToProps = createStructuredSelector({
  me: selectMe(),
  isLoading: selectIsLoading(),
  myAccount: selectMyAccount(),
  myFollowingsLoadStatus: selectMyFollowingsLoadStatus(),
  myFollowingsList: selectMyFollowingsList(),
  searchTerm: selectSearchTerm(),
});

const mapDispatchToProps = (dispatch, props) => ({
  follow: () => dispatch(followBegin('steemhunt')),
  logout: () => dispatch(logoutBegin()),
  getFollowings: me => dispatch(getFollowingsBegin(me)),
  setSearchTerm: (term) => dispatch(setSearchTerm(term)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);

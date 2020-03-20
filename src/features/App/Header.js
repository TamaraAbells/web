import React, { Component } from 'react';
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Popover, Button, Spin, Input, Avatar } from 'antd';
import {
  selectMe,
  selectMyAccount,
  selectIsLoading,
} from 'features/User/selectors';
import { selectSearchTerm } from 'features/Post/selectors';
import { logoutBegin } from 'features/User/actions/logout';
import { setSearchTerm } from 'features/Post/actions/searchPost';
import logo from 'assets/images/logo-nav-pink@2x.png'
import MenuContent from './MenuContent';

class Header extends Component {
  static propTypes = {
    me: PropTypes.string.isRequired,
    isLoading: PropTypes.bool,
    myAccount: PropTypes.object.isRequired,
    logout: PropTypes.func.isRequired,
    setSearchTerm: PropTypes.func.isRequired,
  };

  state = {
    menuVisible: false,
    searchVisible: false,
  };

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
    const { me, myAccount, isLoading, searchTerm } = this.props;
    const searchBarHidden = (this.props.path === '/wallet' || this.props.path === '/post');
    const menu = (
      <MenuContent
        me={me}
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
            <a
              href="/sign-in"
              className="right-margin header-button smaller mobile-hidden"
              onClick={() => window.gtag('event', 'signin_clicked', { 'event_category' : 'signin', 'event_label' : 'Mobile Header' })}
            >
              <Button
                shape="circle"
                icon="plus"
              />
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

            <Button
              href="/sign-in"
              onClick={() => window.gtag('event', 'signin_clicked', { 'event_category' : 'signin', 'event_label' : 'Header Button' })}
              className="header-button smaller right-margin"
            >
              Login
            </Button>
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
  searchTerm: selectSearchTerm(),
});

const mapDispatchToProps = (dispatch, props) => ({
  logout: () => dispatch(logoutBegin()),
  setSearchTerm: (term) => dispatch(setSearchTerm(term)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);

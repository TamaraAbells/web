import React, { Component } from 'react';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import isEmpty from 'lodash/isEmpty';
import { Helmet } from 'react-helmet';
import { Icon } from 'antd'
import { selectAppProps } from './selectors';
import { getAppConfigBegin } from './actions/getAppConfig';
import { RoutesLeft, RoutesRight } from 'Routes';
import Referral from './Referral';
import { isPrerenderer } from 'utils/userAgent';
import 'url-search-params-polyfill';

import 'custom.css';

class App extends Component {

  constructor(props) {
    super(props);
    this.params = new URLSearchParams(this.props.location.search);
    this.state = {
      showBanner: this.params.get('ref') !== null,
      showOtherBanner: window.safeStorage.getItem('hideOtherBanner') !== 'true',
    }
  }

  componentDidMount() {
    if (isEmpty(this.props.appProps) && !isPrerenderer()) {
      this.props.getAppConfig();
    }
  }

  setBannerState = (showBanner) => this.setState({ showBanner });
  hideOtherBanner = () => {
    this.setState({ showOtherBanner: false }, () => window.safeStorage.setItem('hideOtherBanner', 'true'));
  }

  render() {
    const { showBanner, showOtherBanner } = this.state;

    return (
      <div id="app-container" className="app-container">
        <Helmet>
          <title>Steemhunt - Discover Cool Products, Get Rewards</title>
          { /* Search Engine */ }
          <meta name="description" content="Daily ranking of effortlessly cool products that rewards hunters" />
          <meta name="image" content={`${process.env.PUBLIC_URL}/og-image-1200.png`} />
          { /* Schema.org for Google */ }
          <meta itemprop="name" content="Steemhunt - Discover Cool Products, Get Rewards" />
          <meta itemprop="description" content="Daily ranking of effortlessly cool products that rewards hunters" />
          <meta itemprop="image" content={`${process.env.PUBLIC_URL}/og-image-1200.png`} />
          { /* Twitter */ }
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Steemhunt - Discover Cool Products, Get Rewards" />
          <meta name="twitter:description" content="Daily ranking of effortlessly cool products that rewards hunters" />
          <meta name="twitter:image:src" content={`${process.env.PUBLIC_URL}/og-image-1024.png`} />
          <meta name="twitter:site" content="@steemhunt" />
          <meta name="twitter:creator" content="@steemhunt" />
          { /* Open Graph general (Facebook, Pinterest & Google+) */ }
          <meta property="og:title" content="Steemhunt - Discover Cool Products, Get Rewards" />
          <meta property="og:description" content="Daily ranking of effortlessly cool products that rewards hunters" />
          <meta property="og:image" content={`${process.env.PUBLIC_URL}/og-image-1200.png`} />
          <meta property="og:url" content={process.env.PUBLIC_URL} />
          <meta property="og:site_name" content="Steemhunt" />
          <meta property="og:type" content="website" />
        </Helmet>
        {this.params.get('ref') && showBanner && <Referral params={this.params} pathname={this.props.location.pathname} setBannerState={this.setBannerState} />}

        {showOtherBanner &&
          <div className="top-banner-bar">
            <Link to="/about">
              Reviewhunt pre sign-up is live now! <Icon type="right-circle-o" />
            </Link>
            <span onClick={this.hideOtherBanner} alt="Close banner">
              <Icon type="close-circle-o" />
            </span>
          </div>
        }

        <div className={`split-container${(this.params.get('ref') && showBanner) || showOtherBanner ? ' with-banner' : ''}`}>
          <RoutesLeft />
          <RoutesRight />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, props) => createStructuredSelector({
  appProps: selectAppProps()
});

const mapDispatchToProps = (dispatch, props) => ({
  getAppConfig: () => dispatch(getAppConfigBegin()),
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App));

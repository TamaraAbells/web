import React, { Component } from 'react';
import { Icon, Button, Row, Col } from 'antd';
import { Link } from 'react-router-dom';
import axios from 'axios';
import imgLogo from 'assets/images/sh-logo-circle@2x.png';
import imgCat from 'assets/images/img-about-cat@2x.png';
import imgBackground from 'assets/images/img-front-bg@2x.png';
import imgStats1 from 'assets/images/icon-products@2x.png';
import imgStats2 from 'assets/images/icon-fire@2x.png';
import imgStats3 from 'assets/images/icon-money@2x.png';
import imgHuntTokenWhite from 'assets/images/icon-hunt-token@2x.png';
import imgSteemToken from 'assets/images/icon-steem-pink@2x.png';
import imgHuntToken from 'assets/images/icon-hunt-pink@2x.png';
import { scrollTo, scrollTop } from 'utils/scroller';
import { formatNumber } from "utils/helpers/steemitHelpers";

export default class Home extends Component {
  state = {
    count: 0,
    average: 0,
    max: 0,
  };

  componentDidMount() {
    scrollTop();

    axios.get(`${process.env.REACT_APP_API_ROOT}/posts/stats.json`).then((res) => {
      this.setState(res.data);
    }).catch(console.log);
  }

  scrollNext = (e) => {
    e.stopPropagation();
    const vh = document.getElementById('page-2').offsetTop;
    scrollTo(document.getElementById('panel-left'), vh, 800);
  };


  render() {
    return (
      <div>
        <div className="home-page primary-gradient">
          <div className="center-content">
            <img src={imgLogo} alt="Steemhunt Logo" className="main-logo" />
            <h1>STEEMHUNT</h1>
            <h2>Discover Cool Products<br/>Get Rewards</h2>

            <div className="roadmaps">
              <div className="bar-title">
                <span>HUNT TOKEN ECONOMY</span>
              </div>
              <a href="https://review.hunt.town" target="_blank" rel="noopener noreferrer" className="roadmap live">
                <div className="img roadmap-1"></div>
                <h3>REVIEWHUNT</h3>
                <p>Launching hub for makers</p>
                <div className="status">PRE SIGN-UP</div>
              </a>
              <div className="roadmap">
                <div className="img roadmap-2"></div>
                <h3>IDEAHUNT</h3>
                <p>Crowdfunding by NFT</p>
                <div className="status">4Q, 2019</div>
              </div>
              <a href="https://token.hunt.town" target="_blank" rel="noopener noreferrer" className="token-site">
                What is HUNT Platform? <Icon type="right-circle" />
              </a>

               <div className="notice">
                [NOTICE]<br/>
                <a href="https://steemit.com/reviewhunt/@steemhunt/introducing-reviewhunt-a-launching-hub-for-makers-pre-sign-up-is-live" target="_blank"  rel="noopener noreferrer">
                  Introducing Reviewhunt - a launching hub for makers. Pre Sign-up is Live
                </a>
              </div>
            </div>

             <Button shape="circle" size="large" ghost={true} icon="down" onClick={this.scrollNext} />
          </div>
        </div>

        <div className="padded-page" id="page-2">
          <div className="split-page">
            <h2>
              Daily Rankings for<br/>
              Effortlessly Cool Products<br/>
              that Rewards Hunters
            </h2>
            <p>
              Steemhunt is a community for product enthusiasts who love to dig out new products and talk about them with others.
              We call them &quot;Product Hunters.&quot; Hunters can get crypto rewards for sharing the coolest/newest products and competing on a daily basis.
            </p>
            <Link to="/hall-of-fame" className="check-hall-of-fame">Check out Hall of Fame <Icon type="right-circle-o" /></Link>
          </div>
          <img src={imgCat} alt="Steemhunt" className="side-image cat" />
        </div>

        <Row className="columned-page grey-background">
          <h2>Stats for Hunts</h2>

          <Col sm={15} md={8}>
            <img src={imgStats1} alt="Products" />
            <h3>{formatNumber(this.state.count, '0,0')}</h3>
            <p>Number of products shared since Mar 2018</p>
          </Col>
          <Col sm={15} md={8}>
            <img src={imgStats2} alt="Fire" />
            <h3>${formatNumber(this.state.max)}</h3>
            <p>The highest amount earned for a single hunt post</p>
          </Col>
          <Col sm={15} md={8}>
            <img src={imgStats3} alt="Money" />
            <h3>${formatNumber(this.state.average)}</h3>
            <p>The average reward for each hunt post</p>
          </Col>
        </Row>

        <div className="padded-page primary-gradient page-3">
          <h2>Dig More, Earn More<br/>How?</h2>

          <div className="howto">
            <div className="circle">
              <Icon type="search" />
            </div>
            <h4>DISCOVER COOL PRODUCTS</h4>
            <p>
              There are millions of cool tech products like apps, software and gadgets that you may not have seen before.
              You can be a hunter who digs out and introduces cool new products to the Steemhunt community.
            </p>
          </div>
          <Icon type="down" className="splitter" />
          <div className="howto">
            <div className="circle">
              <Icon type="message" />
            </div>
            <h4>UPVOTE AND DISCUSS</h4>
            <p>
              This is a playground for product enthusiasts.
              You can upvote any hunt that you think it seems so cool, and discuss about the products with other hunters.
            </p>
          </div>
          <Icon type="down" className="splitter" />
          <div className="howto">
            <div className="circle">
              <img src={imgHuntTokenWhite} alt="Hunt Token Logo" className="hunt-token-logo" />
            </div>
            <h4>COMPETE AND EARN REWARDS</h4>
            <p>
              Whenever people upvote or comment on your post, and when you make a contribution to this community, you will earn crypto rewards via STEEM and HUNT tokens.
            </p>
          </div>
        </div>

        <div className="padded-page card-page grey-background">
          <h2>Currencies of Steemhunt</h2>

          <div className="card-container">
            <div className="card">
              <h3>STEEM <img src={imgSteemToken} alt="Steem Token" className="steem-token" /></h3>
              <p>
                Steemhunt is built on Steem blockchain. Your content-generation actions
                (i.e. posts, comments) are rewarded by STEEM tokens.
              </p>
              <a href="https://steem.io" target="_blank" rel="noopener noreferrer">What is STEEM? <Icon type="right-circle-o" /></a>
            </div>

            <div className="card">
              <h3>HUNT <img src={imgHuntToken} alt="HUNT Token" className="hunt-token" /></h3>
              <p>
                The hunter’s user score is used for measuring their overall contributions in our community,
                and they are rewarded with HUNT tokens.
              </p>
              <a href="https://token.steemhunt.com" target="_blank" rel="noopener noreferrer">What is HUNT? <Icon type="right-circle-o" /></a>
            </div>
          </div>
        </div>

        <div className="padded-page primary-gradient page-last">
          <div className="left-container">
            <img src={imgLogo} alt="Steemhunt Logo" className="main-logo" />
            <h2>
              Destination for<br/>
              Product Enthusiasts
            </h2>

            <Link to="/post" className="post-button round-border padded-button pink-filled">
              LET&#39;S HUNT NOW
            </Link>
          </div>

          <img src={imgBackground} alt="Steemhunt Preview" className="bg-image" />

          <div className="footer">
            <Link to="/terms">Terms of Service</Link>
            <span className="spacer">&middot;</span>
            <Link to="/privacy">Privacy Policy</Link>
            <span className="spacer">&middot;</span>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    );
  }
}

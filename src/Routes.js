import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { Redirect, Route, Switch, withRouter } from 'react-router-dom';
import queryString from 'query-string';
import asyncComponent from 'asyncComponent';
import { Icon } from 'antd';
import isEmpty from 'lodash/isEmpty';
import { getMeBegin, refreshMeBegin } from 'features/User/actions/getMe';
import { selectMe, selectIsLoading } from 'features/User/selectors';
import { selectSearchTerm } from 'features/Post/selectors';
import Header from 'features/App/Header';
import Post from 'features/Post/Post';
import PostForm from 'features/Post/PostForm';
import Draft from 'features/Post/Draft';
import NotFound from 'components/NotFound';

const Home = asyncComponent(() => import('pages/Home'));
const Terms = asyncComponent(() => import('pages/Terms'));
const Privacy = asyncComponent(() => import('pages/Privacy'));
const Cookies = asyncComponent(() => import('pages/Cookies'));
const HuntedList = asyncComponent(() => import('pages/HuntedList'));
const Profile = asyncComponent(() => import('pages/Profile'));
const HuntedListByAuthor = asyncComponent(() => import('pages/HuntedListByAuthor'));
const RelatedTag = asyncComponent(() => import('pages/RelatedTag'));
const TagList = asyncComponent(() => import('pages/TagList'));
const HallOfFame = asyncComponent(() => import('pages/HallOfFame'));
const Search = asyncComponent(() => import('pages/Search'));
const Airdrop = asyncComponent(() => import('pages/Airdrop'));
const Wallet = asyncComponent(() => import('pages/Wallet'));
const SignUpGuide = asyncComponent(() => import('pages/SignUpGuide'));
const SignUp = asyncComponent(() => import('pages/SignUp'));
const SignIn = asyncComponent(() => import('pages/SignIn'));

const BackButton = withRouter(({ history }) => (
  <Icon
    type="left"
    className="back-button"
    onClick={async () => {
      if (history.length <= 2) {
        history.replace('/')
      } else {
        history.go(-1)
      }
    }}/>
));

export class RoutesLeft extends Component {
  shouldLeftBeActive() {
    const path = window.location.pathname;
    return (/^\/@.+/.test(path) && !/.+\/edit$/.test(path)) ||
      /^\/(about|terms|privacy|cookies|airdrop|bounties)/.test(path) ||
      (/^\/(hall-of-fame|author)\/@.+/.test(path) && !/^\/(author)\/@.+\/edit$/.test(path)) ||
      /^\/(tag)\/.*\/@.+/.test(path);
  }

  render() {
    let className = 'panel-left';
    if (this.shouldLeftBeActive()) {
      className = 'panel-left active';
    }

    return (
      <div className={className} id="panel-left">
        <BackButton/>
        <Switch>
          <Route path="/" exact component={Home} />
          <Route path="/about" exact component={Home} />
          <Route path="/post" exact component={Draft} />
          <Route path='/terms' exact component={Terms} />
          <Route path='/privacy' exact component={Privacy} />
          <Route path='/cookies' exact component={Cookies} />
          <Route path="/hall-of-fame" exact component={Home} />
          <Route path="/hall-of-fame/@:author/:permlink" exact component={Post} />
          <Route path="/wallet" exact component={Airdrop} />
          <Route path="/bounties" exact component={Airdrop} />
          <Route path="/airdrop" exact component={Airdrop} />
          <Route path="/@:author/:permlink" exact component={Post} />
          <Route path="/steemhunt/@:author/:permlink" exact render={(p) => (<Redirect to={`/@${p.match.params.author}/${p.match.params.permlink}`}/>)}/>
          <Route path="/@:author/:permlink/edit" exact component={Draft} />
          <Route path="/author/@:author" exact component={Profile} />
          <Route path="/author/@:author/:permlink" exact component={Post} />
          <Route path="/@:author" exact render={(p) => (<Redirect to={`/author/@${p.match.params.author}`} />)} />
          <Route path="/tag/:tag" exact component={RelatedTag} />
          <Route path="/tag/:tag/@:author/:permlink" exact component={Post} />
          <Route path="/sign-up" exact component={SignUpGuide} />
          <Route path="/sign-in" exact component={Home} />
          <Route path='*' component={NotFound} />
        </Switch>
      </div>
    );
  }
}

class Right extends Component {
  static propTypes = {
    me: PropTypes.string.isRequired,
    isLoading: PropTypes.bool.isRequired,
    searchTerm: PropTypes.string,
    getMe: PropTypes.func.isRequired,
    refreshMe: PropTypes.func.isRequired,
  };

  componentWillMount() {
    let accessToken = null;
    if (this.props.location.search) {
      try {
        accessToken = queryString.parse(this.props.location.search).access_token;
      } catch(e) {
        console.error('URI Parse error', this.props.location.search);
      }
    }

    this.props.getMe(accessToken); // with existing token

    this.refresher = setInterval(this.props.refreshMe, 60000); // to update voting power gage
  }

  componentWillUnmount() {
    clearInterval(this.refresher);
  }

  render() {
    const List = isEmpty(this.props.searchTerm) ? HuntedList : Search;
    const AuthorList = isEmpty(this.props.searchTerm) ? HuntedListByAuthor : Search;
    const TopList = isEmpty(this.props.searchTerm) ? HallOfFame : Search;
    const TagRight =  isEmpty(this.props.searchTerm) ? TagList : Search;

    let redirectPath = null;
    // SteemConnect redirect path
    if (this.props.location.search) {
      try {
        const parsedParams = queryString.parse(this.props.location.search);
        redirectPath = parsedParams.state || (parsedParams.access_token ? '/' : null);
      } catch(e) {
        console.error('URI Parse error', this.props.location.search);
      }
    }

    const { me, isLoading } = this.props;

    if (this.props.location.pathname === '/sign-up' && me) {
      redirectPath = '/';
    }

    if (this.props.location.pathname === '/post' && !isLoading && !me) {
      window.location = '/sign-in';
    }

    return (
      <div className="panel-right" id="panel-right">
        {redirectPath && <Redirect to={redirectPath} /> /* Authentication redirection */ }
        <Header path={this.props.location.pathname}/>
        <Switch>
          <Route path="/" exact component={List} />
          <Route path="/about" exact component={List} />
          <Route path="/post" exact component={PostForm} />
          <Route path="/hall-of-fame" component={TopList} />
          <Route path="/@:author/:permlink/edit" exact component={PostForm} />
          <Route path="/@:author/:permlink" exact component={List} />
          <Route path="/author/@:author" component={AuthorList} />
          <Route path="/tag/:tag" component={TagRight} />
          <Route path="/wallet" exact component={Wallet} />
          <Route path="/bounties" exact component={me || isLoading ? Wallet : List} />
          <Route path="/airdrop" exact component={me || isLoading ? Wallet : List} />
          <Route path="/sign-up" exact component={SignUp} />
          <Route path="/sign-in" exact component={SignIn} />
          <Route path='*' component={List} />
        </Switch>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => createStructuredSelector({
  me: selectMe(),
  isLoading: selectIsLoading(),
  searchTerm: selectSearchTerm(),
});

const mapDispatchToProps = dispatch => ({
  getMe: token => dispatch(getMeBegin(token)),
  refreshMe: () => dispatch(refreshMeBegin()),
});

export const RoutesRight = withRouter(connect(mapStateToProps, mapDispatchToProps)(Right));

import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Icon, Progress } from 'antd';
import { ShareButtonContent } from 'features/Post/components/ShareButton';
import { getUserScore } from 'features/User/utils';
import { isChrome, detectExtension } from 'utils/extension';

const EXTENSION_ID = 'hbffamghdehohidgmlnohhgkmgemplhc';

export default class MenuContent extends PureComponent {
  state = {
    shareVisible: false,
    extensionVisible: false,
  };

  componentDidMount() {
    isChrome() && detectExtension(EXTENSION_ID, (result) => {
      if (!result) {
        this.setState({ extensionVisible: true });
      }
    });
  }

  toggleShare = () => this.setState({ shareVisible: !this.state.shareVisible });

  adjustRecharge(lastValue, lastUpdated) {
    const secPassed = (Date.now() - (new Date(lastUpdated * 1000))) / 1000;
    const currentValue = (lastValue + (secPassed / 3600) * (20 / 24)); // 20% recharge in a day
    const result = currentValue > 100 ? 100 : currentValue;

    return Math.round(result * 100) / 100;
  }

  currentVP({ max_rc, voting_manabar }) {
    return this.adjustRecharge(100 * voting_manabar.current_mana / max_rc, voting_manabar.last_update_time);
  }

  currentRC({ max_rc, rc_manabar}) {
    return this.adjustRecharge(100 * rc_manabar.current_mana / max_rc, rc_manabar.last_update_time);
  }

  render() {
    const { me, myAccount, changeVisibility, logout } = this.props;

    if(me) {
      return (
        <Menu theme="dark">
          <Menu.Item key="1">
            <a href="https://token.steemhunt.com" rel="noopener noreferrer" target="_blank">
              <Icon type="api" /> ABOUT HUNT PLATFORM
            </a>
          </Menu.Item>
          <Menu.Item key="1-5" className="mobile-only">
            <Link to="/bounties" onClick={() => changeVisibility(false)}>
              <Icon type="gift" /> ABOUT BOUNTIES
            </Link>
          </Menu.Item>
          <Menu.Item key="2">
            <Link to="/hall-of-fame" onClick={() => changeVisibility(false)}>
              <Icon type="trophy" /> HALL OF FAME
            </Link>
          </Menu.Item>
          <Menu.Item key="3">
            <Link to={`/wallet`} onClick={() => changeVisibility(false)}>
              <Icon type="wallet" /> WALLET <sup>beta</sup>
            </Link>
          </Menu.Item>
          <Menu.Item key="4">
            <Link to={`/author/@${me}`} onClick={() => changeVisibility(false)}>
              <Icon type="user" /> MY PROFILE
            </Link>
          </Menu.Item>
          <Menu.Item key="4-sub" className="sub" disabled>
            <div className="group">
              <div className="label">
                User Score
              </div>
              <Progress format={percent => Math.round(10 * percent) / 100} percent={getUserScore(myAccount) * 10} status="active" />
            </div>
            <div className="group">
              <div className="label">
                Voting Mana
              </div>
              <Progress percent={Math.round(this.currentVP(myAccount))} status="active" />
            </div>
            <div className="group">
              <div className="label">
                Resource Credits
              </div>
              <Progress percent={Math.round(this.currentRC(myAccount))} status="active" />
            </div>
          </Menu.Item>
          <Menu.Item key="5">
            <a href="https://discord.gg/mWXpgks" rel="noopener noreferrer" target="_blank">
              <Icon type="message" /> CHAT ON DISCORD
            </a>
          </Menu.Item>
          <Menu.Item key="5-1">
            <a href="https://t.me/steemhunt" rel="noopener noreferrer" target="_blank">
              <Icon type="notification" /> SUBSCRIBE TO TELEGRAM
            </a>
          </Menu.Item>
          <Menu.Item key="6" onClick={this.toggleShare}>
            <Icon type="share-alt" /> SPREAD STEEMHUNT
          </Menu.Item>
          {this.state.shareVisible &&
            <Menu.Item key="6-1" className="share-buttons">
              <ShareButtonContent me={me} url="https://steemhunt.com" />
            </Menu.Item>
          }
          {this.state.extensionVisible &&
            <Menu.Item key="7">
              <a href={`https://chrome.google.com/webstore/detail/steemhunt/${EXTENSION_ID}`} rel="noopener noreferrer" target="_blank">
                <Icon type="chrome" /> CHROME EXTENSION
              </a>
            </Menu.Item>
          }
          <Menu.Item key="8">
            <span onClick={logout}>
              <Icon type="poweroff" /> LOGOUT
            </span>
          </Menu.Item>
        </Menu>
      );
    } else {
      return (
        <Menu theme="dark">
          <Menu.Item key="0" className="two-column-hidden">
            <Link to="/about" onClick={() => changeVisibility(false)}>
              <Icon type="question-circle-o" /> ABOUT STEEMHUNT
            </Link>
          </Menu.Item>
          <Menu.Item key="1">
            <a href="https://token.steemhunt.com" rel="noopener noreferrer" target="_blank">
              <Icon type="api" /> ABOUT HUNT PLATFORM
            </a>
          </Menu.Item>
          <Menu.Item key="1-5">
            <Link to="/bounties" onClick={() => changeVisibility(false)}>
              <Icon type="gift" /> ABOUT BOUNTIES
            </Link>
          </Menu.Item>
          <Menu.Item key="2">
            <Link to="/hall-of-fame" onClick={() => changeVisibility(false)}>
              <Icon type="trophy" /> HALL OF FAME
            </Link>
          </Menu.Item>
          <Menu.Item key="3">
            <a href="https://discord.gg/mWXpgks" rel="noopener noreferrer" target="_blank">
              <Icon type="message" /> CHAT ON DISCORD
            </a>
          </Menu.Item>
          <Menu.Item key="3-1">
            <a href="https://t.me/steemhunt" rel="noopener noreferrer" target="_blank">
              <Icon type="notification" /> SUBSCRIBE TO TELEGRAM
            </a>
          </Menu.Item>
          {this.state.extensionVisible &&
            <Menu.Item key="4">
              <a href={`https://chrome.google.com/webstore/detail/steemhunt/${EXTENSION_ID}`} rel="noopener noreferrer" target="_blank">
                <Icon type="chrome" /> CHROME EXTENSION
              </a>
            </Menu.Item>
          }
        </Menu>
      );
    }
  }
}

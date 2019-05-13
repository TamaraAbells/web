import React, { Component } from 'react';
import { Icon, Progress } from 'antd';
import imgHuntPlatform from 'assets/images/wallet/img-hunt-platform@2x.png';
import { formatNumber, formatFloat } from "utils/helpers/steemitHelpers";
import api from 'utils/api';

const BarProgress = ({ data, label, disabled, max }) => {
  return (
    <div className={`bar-progress ${disabled && 'disabled'}`}>
      <span className="progress-text">{label}: {formatNumber(data)}</span>
      <Progress percent={formatFloat(data/max*100)} showInfo={false} />
    </div>
  )
}

export default class Airdrop extends Component {
  constructor(props) {
    super(props);
    this.state = {
      record_time: 0,
      total: 0,
      airdrops: {}
    }
  }

  componentDidMount() {
    api.get('/hunt_transactions/stats.json').then((res) => {
      this.setState(res);
    })
  }

  renderStatus() {
    const { total, airdrops } = this.state;
    const airdropKeys = Object.keys(airdrops);

    return (
      <div className="inner-block">
        <div className="round-progress">
          <Progress type="circle" percent={formatFloat(total / 250000000 * 100)} />
          <span className="progress-text">{formatNumber(total)}<br/>HUNT tokens</span>
        </div>
        {airdropKeys.map((key, i) => {
          const { data, label, disabled } = airdrops[key];
          return <BarProgress key={i} data={data} label={label} disabled={disabled} max={airdrops[airdropKeys[0]].data} />;
        })}
      </div>
    )
  }

  render() {
    return (
      <div className="contents-page">
        <div className="page-block">
          <h1>Bounties for<br/>Ecosystem and<br/>Community Building</h1>
          <div className="thin">
            The most important KSF (Key Successful Factor) of the HUNT platform is to build the real user base and amplify our community activities, rather than just focusing on the future token values. So, we are running a unique way to distribute our tokens - ecosystem and community building bounties over 300 days.
          </div>
        </div>
        <div className="page-block">
          <h2 className="bottom-line">Swap &amp; Bounty Status</h2>
          <div className="thin">as of {this.state.record_time}</div>
          <div className="thin">{this.renderStatus()}</div>
        </div>
        <div className="page-block">
          <h1 className="margin-top">What is HUNT<br/>Platform?</h1>
          <div className="thin">
            HUNT is an incentivising community platform on top of Steem Blockchain for product influencers who have exceptional knowledge and passion for cool new products.
            It’s a bridging platform for makers to reach out to early adopters for the successful launch of their product.

            <a href="https://token.steemhunt.com/" className="action less-margin" target="_blank" rel="noopener noreferrer">
              Learn more <Icon type="right-circle-o" />
            </a>
          </div>
          <img src={imgHuntPlatform} alt="HUNT Platform" className="image hunt-platform" />
        </div>
      </div>
    );
  }
}

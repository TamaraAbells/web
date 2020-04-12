import React, { Component } from 'react';
import { Icon, Progress, Button, notification } from 'antd';
import imgHuntPlatform from 'assets/images/wallet/img-hunt-platform@2x.png';
import { formatNumber, formatFloat } from "utils/helpers/steemitHelpers";
import api from 'utils/api';
import steem from 'steem';
import { getToken } from 'utils/token';

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
      airdrops: {},
      polls: { stats: { 'Agree': 0, 'Disagree': 0 }, has_voted: false, my_stake: 0, username: null },
      my_poll_selection: '',
      isLoading: false,
    }
  }

  componentDidMount() {
    api.get('/hunt_transactions/stats.json').then((res) => this.setState({
      record_time: res.record_time,
      total: res.total,
      airdrops: res.airdrops
    }));

    api.get('/polls/stats.json', null, true).then((res) => this.setState({ polls: res }));
  }

  submitPoll() {
    const { my_poll_selection } = this.state;

    this.setState({ isLoading: true });

    // Post on SH
    api.post('/polls.json', { selection: my_poll_selection }, true).then((res) => {
      steem.broadcast.customJson(getToken(), [], [res.username], 'steemhunt-poll-1', JSON.stringify({
        selection: my_poll_selection,
        stake: res.my_stake,
      }), (error, result) => {
        if (error) {
          notification['error']({ message: 'Failed to broadcast on Steem blockchain. Please try again later.' });
          this.setState({ isLoading: false });
          return;
        }

        this.setState({ polls: res, isLoading: false });
        notification['success']({ message: 'Thank you for your participation!' });
      });
    }).catch((e) => {
      notification['error']({ message: e.message });
      this.setState({ isLoading: false });
    });
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

  renderPoll() {
    const { polls } = this.state;
    const { stats, has_voted } = polls;
    const totalStake = Object.keys(stats).reduce((sum, key) => sum + parseFloat(stats[key]), 0);

    return (
      <div className="page-block">
        <h2 className="bottom-line">Community Poll</h2>
        <div className="thin">Period: April 12th, 21:00 KST - 17th, 21:00 KST, 2020</div>
        <div className="thin top-margin poll">
          <p>
            Steemhunt team is running a poll to determine whether the following accounts should remain on our blacklist.
            Please read the full announcement <a href="https://steemit.com/@steemhunt" target="_blank" rel="noopener noreferrer">here</a>).
          </p>

          <ul>
            <li>@roelandp</li>
            <li>@netuoso</li>
            <li>@ausbitbank</li>
            <li>@therealwolf</li>
            <li>@followbtcnews</li>
            <li>@stoodkev</li>
            <li>@themarkymark</li>
          </ul>

          <p>
            The voting results are calculated based on the summation of all voted HUNT stakes (Steemhunt and external wallet balance).
            The HUNT team members and users who have been blacklisted are not allowed to participate in the voting.
            Your voting will be recorded on Steem blockchain by using custom_json transaction in order to maintain transparency.
          </p>

          {has_voted ?
            <p>☑️ You have already participated in this poll.</p>
          :
            <div>
              <p>
                Please submit your opinion.
              </p>

              <ul className="selections">
                <li><input name="selection" type="radio" onClick={() => this.setState({ my_poll_selection: 'Agree' })}/> I agree that the accounts listed above should be on the blacklist</li>
                <li><input name="selection" type="radio" onClick={() => this.setState({ my_poll_selection: 'Disagree' })}/> I disagree and they should be removed from the blacklist</li>
              </ul>

              <div className="text-right">
                <Button
                  type="primary"
                  className="submit-button"
                  loading={this.state.isLoading}
                  onClick={() => this.submitPoll()}>
                  Submit
                </Button>
              </div>
            </div>
          }

          <div className="result">Result</div>
          {Object.keys(stats).map((key, i) => {
            return <BarProgress key={i} data={stats[key]} label={key} max={totalStake} />;
          })}
        </div>
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
        {this.renderPoll()}
        <div className="page-block">
          <h2 className="bottom-line">Bounty Distribution Status</h2>
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

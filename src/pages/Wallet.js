import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import isEmpty from 'lodash/isEmpty';
import { List, Avatar, Button, Modal, Icon, Tabs, Tooltip, notification } from 'antd';
import { formatNumber } from "utils/helpers/steemitHelpers";
import {
  selectBalances,
  selectEthAddress,
  selectTransactions,
  selectWithdrawals,
  selectIsLoading,
  selectIsUpdating,
} from 'features/Wallet/selectors';
import { getTransactionsBegin } from 'features/Wallet/actions/getTransactions';
import { withdrawBegin } from 'features/Wallet/actions/withdraw';
import { setEthAddressBegin } from 'features/Wallet/actions/setEthAddress';
import CircularProgress from 'components/CircularProgress';
import { selectMe } from 'features/User/selectors';
import { shortFormat } from 'utils/date';
import tokenPlaceholder from 'assets/images/wallet/token-placeholder@2x.png';
import TransferModal from 'features/Wallet/components/TransferModal';
import metaMaskImage from 'assets/images/wallet/img-no-metamask@3x.png';
import initializeWeb3 from 'web3.js';

const NETWORK = 'https://etherscan.io';
const CONTRACT = '0x9aab071b4129b083b01cb5a0cb513ce7eca26fa5';

class Wallet extends Component {
  static propTypes = {
    me: PropTypes.string.isRequired,
    balances: PropTypes.object.isRequired,
    withdrawals: PropTypes.array.isRequired,
    transactions: PropTypes.array.isRequired,
    isLoading: PropTypes.bool.isRequired,
    getTransactions: PropTypes.func.isRequired,
    withdraw: PropTypes.func.isRequired,
    ethAddress: PropTypes.string,
    isUpdating: PropTypes.bool.isRequired,
  };

  state = {
    withdrawStepVisible: true,
    ethAddress: null,
    activeTabKey: '1',
    modalVisible: false,
    transferModalVisible: false,
    agreement: false,
    amountCheckMsg: '',
  };

  toggleModal = () => {
    this.setState({
      modalVisible: !this.state.modalVisible,
    });
  };

  componentDidMount() {
    this.props.getTransactions();
    this.web3 = initializeWeb3();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.ethAddress !== null) {
      this.setState({ ethModalVisible: false });
    }
  }

  async validEthereumNetwork() {
    if (this.web3 === null) {
      Modal.error({
        title: "Please install Metamask",
        className: "metamask-install-modal",
        autoFocusButton: null,
        maskClosable: true,
        content: (
          <div className={"metamask-install-body"}>
            <p>You need to use Metamask to connect your own Ether wallet address.</p>
            <img src={metaMaskImage} alt="Metamask" className="fox" />
          </div>
        ),
        okText: "Get Metamask",
        onOk: () => window.open('https://metamask.io/', '_blank')
      });
      return false;
    }

    let ethAccounts = await this.web3.eth.getAccounts();
    if (ethAccounts.length === 0) {
      if (window.ethereum) {
        ethAccounts = await window.ethereum.enable();
      }

      if (ethAccounts.length === 0) {
        notification['error']({ message: "You need to login on Metamask." });
        return false;
      }
    }

    const ethNetwork = await this.web3.eth.net.getNetworkType();
    if (ethNetwork !== 'main') {
      Modal.error({
        title: 'Incorrect Network',
        content: `You are currently in ${ethNetwork} network. Please change your network to Main Ethereum Network.`,
      });

      return false;
    }

    return true;
  }

  requestSignTransaction = async () => {
    if (!(await this.validEthereumNetwork())) {
      return false;
    }

    const ethAccounts = await this.web3.eth.getAccounts();

    Modal.success({
      title: "Connect External Wallet",
      className: "metamask-install-modal",
      autoFocusButton: null,
      maskClosable: true,
      content: (
        <div className={"metamask-install-body"}>
          <p>You can connect your own Ether wallet address by using MetaMask.</p>
          <img src={metaMaskImage} alt="Metamask" className="fox" />
          <p>Please notice that</p>
          <ul>
            <li>You can only connect one Ether wallet at a time, and you can only transfer HUNT tokens to the wallet you're currently connected to.</li>
            <li>Exchange&#39;s wallet is not able to be connected (MetaMask is required to connect).</li>
            <li>The HUNT balance from the wallet address above is automatically added to your total HUNT token balance, which will be counted for your user score.</li>
          </ul>
        </div>
      ),
      okText: "Connect to Metamask",
      onOk: async () => {
        const message = `Connect this Ethereum address to your Steemhunt account, ${this.props.me}. (Timestamp: ${new Date().getTime()})`;
        const signature = await this.web3.eth.personal.sign(message, ethAccounts[0], null);
        this.props.setEthAddress(ethAccounts[0], message, signature);
      }
    })
  };

  handleTransfer = (transferAmount) => {
    this.props.withdraw(transferAmount);
    this.setState({ activeTabKey: '2', transferModalVisible: false });
  };
  toggleTransferModal = () => this.setState({ transferModalVisible: !this.state.transferModalVisible });

  etherscanLink(walletAddress) {
    return `${NETWORK}/token/${CONTRACT}?a=${walletAddress}`
  }

  render() {
    const { me, balances, isLoading, transactions, withdrawals, ethAddress, isUpdating } = this.props;
    if (isLoading || isUpdating || isEmpty(me)) {
      return <CircularProgress />;
    }

    const totalHuntBalance = parseFloat(balances.internal_hunt_balance) + parseFloat(balances.external_hunt_balance);

    return (
      <div className="wallet">
        <Helmet>
          <title>Wallet - Steemhunt</title>
        </Helmet>

        <div className="balance-bar left-padded right-padded">
          <div className="balance-row">
            <div className="sans small">Total HUNT Token Balance</div>
            <div className="sans balance">
              {formatNumber(totalHuntBalance)} HUNT
              <Button shape="circle" size="small" icon="reload" onClick={() => this.props.getTransactions()}/>
            </div>
          </div>
          <div className="balance-row">
            <div className="sans small">Steemhunt Wallet</div>
            <div className="token-bar-container">
              <div className="token-bar">
                <span className="token-amount">
                  {formatNumber(balances.internal_hunt_balance)} HUNT
                  {balances.locked_hunt > 0 &&
                    <span>&nbsp;(<Icon type="lock" /> {formatNumber(balances.locked_hunt)})</span>
                  }
                </span>
              </div>
              <div className="token-button">
                {ethAddress ?
                  <Button type="primary" className="submit-button right" onClick={this.toggleTransferModal}>TRANSFER</Button>
                :
                  <Tooltip title="Please connect your external wallet first using CONNECT button below">
                    <Button type="primary" className="submit-button right" disabled>TRANSFER</Button>
                  </Tooltip>
                }
              </div>
            </div>
            {balances.locked_hunt > 0 &&
              <ul className="sans small">
                <li>- Ready for transfer: {formatNumber(balances.internal_hunt_balance - balances.locked_hunt)} HUNT</li>
                <li>- Unlocking tokens tomorrow: {formatNumber(balances.daily_unlock)} HUNT</li>
              </ul>
            }
          </div>
          <div className="balance-row">
            <div className="sans small">
              External Wallet -&nbsp;
              {ethAddress ?
                <a href={this.etherscanLink(ethAddress)} target="_blank" rel="noopener noreferrer">{ethAddress}</a>
              :
                'Not connected'
              }
            </div>
            <div className="token-bar-container">
              <div className="token-bar">
                <span className="token-amount">{formatNumber(balances.external_hunt_balance)} HUNT</span>
              </div>
              <div className="token-button">
                <Button
                  type="primary"
                  className="submit-button right"
                  onClick={this.requestSignTransaction}>
                  {ethAddress ? 'CHANGE ADDRESS' : 'CONNECT'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <TransferModal
          walletProps={this.props}
          modalVisible={this.state.transferModalVisible}
          modalToggle={this.toggleTransferModal}
          handleTransfer={this.handleTransfer}
        />

        <Tabs activeKey={this.state.activeTabKey} onTabClick={(key) => this.setState({ activeTabKey: key })}>
          <Tabs.TabPane tab="Bounties" key="1">
            {transactions.length === 0 ?
              <div className="placeholder">
                <img src={tokenPlaceholder} alt="No transactions" />
                <p>No Transactions Yet</p>
              </div>
              :
              <List
                itemLayout="horizontal"
                dataSource={transactions}
                className="transactions"
                renderItem={t => (
                  <List.Item className="left-padded transaction-item">
                    <List.Item.Meta
                      avatar={<Avatar icon="arrow-left" className="icon received" />}
                      title={
                        <div className="title received">
                          {`Received ${formatNumber(t.amount)} from ` + (t.sender_username ? `@${t.sender_username}` : `ETH Wallet`)}
                        </div>
                      }
                      description={
                        <div>
                          <div className="memo">{t.memo}</div>
                          <div className="date">{shortFormat(t.created_at)}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            }
          </Tabs.TabPane>
          <Tabs.TabPane tab="Transfers" key="2">
            {withdrawals.length === 0 ?
              <div className="placeholder">
                <img src={tokenPlaceholder} alt="No transactions" />
                <p>No Withdrawals Yet</p>
              </div>
              :
              <List
                itemLayout="horizontal"
                dataSource={withdrawals}
                className="transactions"
                renderItem={w => (
                  <List.Item className="left-padded transaction-item">
                    <List.Item.Meta
                      avatar={w.status === 'sent' ?
                        <Avatar icon="arrow-right" className="icon sent" />
                        :
                        (w.status === 'error' || w.status === 'failed' ?
                          <Avatar icon="exclamation" className="icon error" />
                          :
                          <Avatar icon="loading" className="icon pending" />
                        )
                      }
                      title={
                        <div className="title sent">
                          {`Withdraw ${formatNumber(w.amount)} HUNT`}
                        </div>
                      }
                      description={
                        <div>
                          <div className="memo">
                            Status: {w.status && w.status.replace(/_/g, ' ')}
                            {w.tx_hash &&
                              <span> | TxHash - <a href={`${NETWORK}/tx/${w.tx_hash}`} className="tx-hash" target="_blank" rel="noopener noreferrer">{w.tx_hash} <Icon type="link" /></a></span>
                            }
                          </div>
                          <div className="date">{shortFormat(w.created_at)}</div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            }
          </Tabs.TabPane>
        </Tabs>
      </div>
    );
  }
}

const mapStateToProps = (state, props) => createStructuredSelector({
  me: selectMe(),
  balances: selectBalances(),
  transactions: selectTransactions(),
  withdrawals: selectWithdrawals(),
  isLoading: selectIsLoading(),
  ethAddress: selectEthAddress(),
  isUpdating: selectIsUpdating(),
});

const mapDispatchToProps = (dispatch, props) => ({
  getTransactions: () => dispatch(getTransactionsBegin()),
  setEthAddress: (address, message, signature) => dispatch(setEthAddressBegin(address, message, signature)),
  withdraw: (amount) => dispatch(withdrawBegin(amount)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);

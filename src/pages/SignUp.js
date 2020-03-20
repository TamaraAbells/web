import React, { Component } from 'react';
import { Helmet } from 'react-helmet';
import { Form, Input, Icon, Button, notification, Modal } from 'antd';
import { withRouter } from 'react-router-dom';
import api from 'utils/api';
import userImage from 'assets/images/sign-up/icon-create-account@2x.png';
import smsImage from 'assets/images/sign-up/img-phone@2x.png';
import pinImage from 'assets/images/sign-up/img-phone-confirmation@2x.png';
import verifiedImage from 'assets/images/sign-up/icon-thumb@2x.png';
import keyImage from 'assets/images/sign-up/icon-key@2x.png';
import catImg from 'assets/images/img-about-cat@2x.png';
import ReactPhoneInput from 'react-phone-input-2';
import { isValidNumber, formatNumber } from 'libphonenumber-js';
import steem from 'steem';
import crypto from '@steemit/libcrypto';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { validateAccountName } from 'utils/helpers/accountName';

import 'react-phone-input-2/dist/style.css'

const FormItem = Form.Item;
const PIN_VALID_SECONDS = 180

class SignUp extends Component {
  state = {
    pageTitle: 'Create Account',
    stage: 0,
    accountCheck: null,
    accountCheckMsg: null,
    accountName: null,
    phoneCheck: false,
    phoneNumber: '',
    pinSent: false,
    pinNumber: '',
    pinCheck: false,
    modalVisible: false,
    privateKey: '',
    keys: null,
    loading: false,
    pinTimer: 0
  };

  checkAccount = (_, value, callback) => {
    const msg = validateAccountName(value);
    if (msg !== null) {
      this.setState({ accountCheck: 'error', accountCheckMsg: msg });
      return callback();
    }

    this.setState({ accountName: null, accountCheck: 'loading', accountCheckMsg: 'Checking the server ...' }, () => {
      try {
        steem.api.lookupAccountNames([value], (err, result) => {
          if (this.state.accountCheck === 'error') { // Another validation has ran and validation has failed
            return callback();
          }
          if (err || !result) {
            console.error(err, result);
            return callback('Service is temporarily unavailable, Please try again later.');
          }

          if (result[0] !== null) {
            this.setState({ accountCheck: false, accountCheckMsg: 'This username is already in use.' }, () => { return callback(); });
          } else {
            this.setState({ accountName: value, accountCheck: 'validated', accountCheckMsg: <div>The username <b>{value}</b> is available.</div> }, () => { return callback(); });
          }
          return callback();
        });
      } catch (error) {
        return callback('Service is temporarily unavailable, Please try again later.');
      }
    });
  };

  setPhoneNumber = (number) => {
    this.setState({ phoneNumber: number, phoneCheck: isValidNumber(number) });
  };

  setPinNumber = (e) => {
    this.setState({ pinNumber: e.target.value, pinCheck: /^\d{4}$/.test(e.target.value) });
  };

  submitAccount = (e) => {
    e.preventDefault();
    if (this.state.accountCheck === 'validated' && this.state.accountName !== null) {
      this.moveStage(1);
    }
  };

  sendSms = (e, resend = false) => {
    e.preventDefault();
    api.post('/phone_numbers/send_sms.json', {
      phone_number: formatNumber(this.state.phoneNumber, 'International')
    }).then((res) => {
      if (res.sent) {
        notification['success']({ message: 'Pin number has been successfully sent to :' + this.state.phoneNumber });
        this.startTimer(PIN_VALID_SECONDS);
        if (!resend) {
          this.moveStage(1);
        }
      } else {
        console.error('Unsupported response', res);
      }
    }).catch((e) => notification['error']({ message: e.message }));
  };

  verifyPin = (e) => {
    e.preventDefault();
    api.post('/phone_numbers/verify_pin.json', {
      user_pin: this.state.pinNumber, phone_number: formatNumber(this.state.phoneNumber, 'International')
    }).then((res) => {
      if (res.is_verified) {
        notification['success']({ message: 'Pin number has been successfully verified' });
        this.moveStage(1);
      } else {
        console.error('Unsupported response', res);
      }
    }).catch((e) => notification['error']({ message: e.message }));
  };

  validateStatus = (status) => {
    if (status === null) {
      return '';
    }
    if (status === 'loading') {
      return 'validating';
    }
    return status === 'validated' ? "success" : "error"
  };

  moveStage = (by) => {
    this.setState({
      stage: this.state.stage + by,
    })
  };

  setModalVisible(modalVisible) {
    this.setState({ modalVisible });
  }

  startTimer(setTimerTo = null) {
    if (setTimerTo) {
      this.setState({
        pinTimer: setTimerTo
      })
    }
    if ( this.state.pinTimer > 0 ) {
      setTimeout(() => {
        this.setState({ pinTimer: this.state.pinTimer - 1}, () => {
          this.startTimer()
        })
      }, 1000)
    } else {
      this.setState({
        pinTimer: null
      })
    }
  }

  createPrivateKeys(e) {
    e.preventDefault();
    const randomKey = crypto.generateKeys();
    const privateKey = 'P' + randomKey.private;
    const keys = steem.auth.generateKeys(this.state.accountName, privateKey, ['posting', 'active', 'owner', 'memo']);
    this.setState({ keys, privateKey }, () => this.moveStage(1));
  }

  confirmPrivateKey() {
    this.setState({ loading: true }, () => {
      api.post('/users/sign_up', {
        sign_up: {
          keys: this.state.keys,
          username: this.state.accountName,
          phone_number: formatNumber(this.state.phoneNumber, 'International')
        }
      }).then((res) => {
        this.setState({
          loading: false,
          modalVisible: false,
          stage: this.state.stage + 1,
          pageTitle: "You're all set!",
        });
      }).catch((e) => {
        this.setState({
          loading: false
        }, () => notification['error']({ message: e.message }))
      });
    });
  }

  renderForm(stage) {
    const { getFieldDecorator } = this.props.form;

    let form;

    switch (stage) {
      case 0:
        form = (
          <div key={0} className="form-container">
            <img src={userImage} alt="Steem User" />
            <p>
              Choose your username.
              This will be the name that you are called in Steemhunt and other Steem-based apps.
            </p>
            <Form onSubmit={this.submitAccount}>
              <FormItem
                validateStatus={this.validateStatus(this.state.accountCheck)}
                help={this.state.accountCheckMsg}
                hasFeedback
              >
                {getFieldDecorator('userName', {
                  rules: [{ required: true, message: null, validator: this.checkAccount }],
                })(
                  <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="Username" autoCapitalize="off" autoFocus />
                )}
              </FormItem>
              <div className="actions-container">
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={this.state.accountCheck !== 'validated'}
                  onClick={() => window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'ID Verified' })}
                  block
                >
                  Continue
                </Button>
              </div>
            </Form>
            <p className="form-tail">
              Do you already have an account?<br />
              <a href="/sign-in" className="action less-margin" alt="Sign In">
                Sign In
              </a>
            </p>
          </div>
        )
        break;
      case 1:
        form = (
          <div key={1} className="form-container">
            <img src={smsImage} alt="SMS Send" />
            <p>
              Enter your phone number.
              We will send you a text message with a verification code that you’ll need to enter on the next screen.
            </p>
            <Form onSubmit={this.sendSms}>
              <FormItem>
                <ReactPhoneInput inputStyle={{height: 40, width: '100%'}} defaultCountry={'us'} value={this.state.phoneNumber} onChange={this.setPhoneNumber} inputExtraProps={{ autoFocus: true }} />
              </FormItem>
              <div className="actions-container">
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={!this.state.phoneCheck}
                  onClick={() => window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'Send SMS' })}
                  block
                >
                  Send SMS
                </Button>
                <p className="form-tail">
                  <span type="ghost" onClick={() => this.moveStage(-1)} className="fake-link"><Icon type="left" /> Back</span>
                </p>
              </div>
            </Form>
          </div>
        )
        break;
        case 2:
          form = (
            <div key={2} className="form-container">
              <img src={pinImage} alt="Pin Send" />
              <p>
              Enter the confirmation code.
              We sent the code to {this.state.phoneNumber} vis SMS.
              </p>
              <Form onSubmit={this.verifyPin}>
                <FormItem>
                  <Input
                    placeholder="Confirmation code (4 digits)"
                    prefix={<Icon type="key" style={{ color: 'rgba(0,0,0,.25)' }} />}
                    suffix={<span onClick={(e) => this.sendSms(e, true)} disabled={this.state.pinTimer !== null} className="fake-link">{this.state.pinTimer ? `Resend in ${this.state.pinTimer}s` : 'Resend'}</span>}
                    value={this.state.pinNumber}
                    onChange={this.setPinNumber}
                    autoFocus
                  />
                </FormItem>
                <div className="actions-container">
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={!this.state.pinCheck}
                    onClick={() => window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'Verify PIN' })}
                    block
                  >
                    Verify PIN
                  </Button>
                  <p className="form-tail">
                    <span type="ghost" onClick={() => this.moveStage(-1)} className="fake-link"><Icon type="left" /> Back</span>
                  </p>
                </div>
              </Form>
            </div>
          )
        break;
      case 3:
        form = (
          <div key={3} className="form-container">
            <img src={verifiedImage} alt="Pin Verified" />
            <p>
              Thank you @{this.state.accountName} <br/>
              Your phone number has been verified.
            </p>
            <div className="actions-container">
              <Form onSubmit={(e) => this.createPrivateKeys(e)}>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={!this.state.pinCheck}
                  onClick={() => window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'Phone Verified' })}
                  block
                >
                  Continue
                </Button>
              </Form>
            </div>
          </div>
        )
        break;
      case 4:
        form = (
          <div key={4} className="form-container">
            <img src={keyImage} alt="Pin Verified" />
            <p>
              This is the private key (passwords) of your Steem account (<span className="pink">{this.state.accountName}</span>).<br/>
              Please keep it secured.
            </p>
            <div className="private-key-container">
              {this.state.privateKey}
            </div>
            <div className="actions-container">
              <CopyToClipboard text={this.state.privateKey} onCopy={() => notification['success']({ message: 'Your private key has been copied to your clipboard.' })}>
                <Button type="primary" ghost block>Copy the key</Button>
              </CopyToClipboard>
              <Button
                type="primary"
                onClick={() => {
                  this.setModalVisible(true);
                  window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'Last confirmation' });
                }}
                block
              >
                Continue
              </Button>
            </div>
          </div>
        )
        break;
      case 5:
        form = (
          <div key={5} className="form-container">
            <p>
              Now you can use Steemhunt and other Steem apps via your private key (password).
            </p>
            <img className="cat-img" src={catImg} alt="All Done" />

            <div className="actions-container">
              <Button type="primary" block onClick={() => window.location = "/sign-in"}>Login Now</Button>
            </div>
            <p className="form-tail">
              <a href="/" className="action less-margin" alt="Go to main page">
                Go to main page
              </a>
            </p>
          </div>
        )
        break;
      default:
    }
    return form;
  }

  render() {
    return (
      <div className="sign-up-form">
        <Helmet>
          <title>Sign up - Steemhunt</title>
        </Helmet>
        <h1>{this.state.pageTitle}</h1>
        {this.renderForm(this.state.stage)}
        <Modal
          wrapClassName="private-key-modal"
          visible={this.state.modalVisible}
          onCancel={() => !this.state.loading && this.setModalVisible(false)}
          footer={[
            <Button
              key="back"
              type="primary"
              disabled={this.state.loading}
              onClick={() => {
                this.setModalVisible(false);
                window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'Last confirm - No' });
              }}
              ghost
            >
              No, I didn&#39;t save it yet.
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={this.state.loading}
              onClick={() => {
                this.confirmPrivateKey();
                window.gtag('event', 'signup_process', { 'event_category' : 'signup', 'event_label' : 'Last confirm - Yes' });
              }}
            >
              Yes, I have saved my key securely.
            </Button>,
          ]}
        >
          <h1>Have you securly stored your private key (passwords)?</h1>
          <p>
            Your private key is used to generate a signature for actions, such as signing-in and creating transactions in the Steem blockchain.
            <b> We cannot recover your key if you lose it. </b>
            Please securely store the key in a way that only you can access it.
          </p>
        </Modal>
      </div>
    );
  }
}

export default withRouter(Form.create()(SignUp));

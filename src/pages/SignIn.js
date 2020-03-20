import React, { Component } from "react";
import { Helmet } from "react-helmet";
import { createStructuredSelector } from 'reselect';
import { Form, Input, Icon, Button, notification } from "antd";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import steem from "steem";
import userImage from "assets/images/sign-up/icon-create-account@2x.png";
import { getMeBegin } from "features/User/actions/getMe";
import { selectMe } from 'features/User/selectors';
import { setToken, setUsername } from "utils/token";

const FormItem = Form.Item;

class SignIn extends Component {
  state = { username: "", password: "", loading: false };

  login = e => {
    e.preventDefault();
    console.log(this.state);
    steem.api.getAccounts([this.state.username], (err, result) => {
      if (err) {
        notification["error"]({ message: "Steem api failed to load." });
        this.setState({ loading: false });
        return;
      }

      if (result.length === 0) {
        notification["error"]({ message: "User not found." });
        this.setState({ loading: false });
        return;
      }

      let publicOwnerKey = result[0].owner.key_auths[0][0];
      let publicActiveKey = result[0].active.key_auths[0][0];
      let publicPostingKey = result[0].posting.key_auths[0][0];

      let loginSuccess = false;
      try {
        loginSuccess =
          steem.auth.wifIsValid(this.state.password, publicPostingKey) ||
          steem.auth.wifIsValid(this.state.password, publicActiveKey) ||
          steem.auth.wifIsValid(this.state.password, publicOwnerKey);
      } catch (e) {
        notification["error"]({ message: "Failed to validate private key." });
        this.setState({ loading: false });
        return;
      }

      if (loginSuccess) {
        setUsername(this.state.username);
        setToken(this.state.password);
        this.props.getMe(this.state.password, this.state.username);
      } else {
        notification["error"]({
          message: "Wrong username/password combination."
        });
      }

      this.setState({ loading: false });
    });
  };

  render() {
    return (
      <div className="sign-up-form">
        <Helmet>
          <title>Login - Steemhunt</title>
        </Helmet>
        <h1>Login</h1>
        <div key={0} className="form-container">
          <h3 className="text-center">
            Steemhunt do not store your password information (private or posting
            key). Your login credential will stay only on your device.
          </h3>

          <img src={userImage} alt="Steem User" />
          <Form onSubmit={this.login}>
            <FormItem hasFeedback>
              <Input
                prefix={
                  <Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />
                }
                placeholder="Username"
                autoCapitalize="off"
                onChange={e => this.setState({ username: e.target.value })}
                autoFocus
              />
              <Input.Password
                prefix={
                  <Icon type="key" style={{ color: "rgba(0,0,0,.25)" }} />
                }
                placeholder="Posting Key or Password"
                autoCapitalize="off"
                onChange={e => this.setState({ password: e.target.value })}
                autoFocus
              />
            </FormItem>
            <Button
              className="login-button"
              type="primary"
              htmlType="submit"
              disabled={
                this.state.loading ||
                this.state.username === "" ||
                this.state.password === ""
              }
              onClick={() =>
                window.gtag("event", "signup_process", {
                  event_category: "login",
                  event_label: "ID Verified"
                })
              }
              block
            >
              Login
            </Button>

            <h3 className="dont-have-account text-center">
              Don't have an account?
            </h3>
          </Form>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) =>
  createStructuredSelector({
    me: selectMe()
  });

const mapDispatchToProps = dispatch => ({
  getMe: (token, username) => dispatch(getMeBegin(token, username))
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(Form.create()(SignIn))
);

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { refreshMeBegin } from 'features/User/actions/getMe';
import { selectMe, selectProfileDraft, selectMyAccount } from 'features/User/selectors';
import { updateProfileDraft, resetProfileDraft } from 'features/User/actions/updateProfileDraft';
import { Form, Input, Button, Spin, Icon, Upload, notification } from 'antd';
import { getCachedImage } from 'features/Post/utils';
import SteemConnect from 'utils/steemConnectAPI';
import { uploadImage, validateImage } from 'utils/helpers/uploadHelpers';
import { urlRegExp } from 'utils/helpers/stringHelpers';

const FormItem = Form.Item;

class ProfileForm extends Component {
  static propTypes = {
    me: PropTypes.string.isRequired,
    myAccount: PropTypes.object.isRequired,
    profileDraft: PropTypes.object.isRequired,
    updateProfileDraft: PropTypes.func.isRequired
  }

  constructor(props) {
    super(props);

    this.state = {
      about: '',
      website: '',
      cover_image: '',
      profile_image: '',
      cover_image_loading: false,
      profile_image_loading: false,
      submitLoading: false
    }
  }

  componentWillUnmount() {
    this.props.resetProfileDraft();
  }

  handleChange = (e, key) => {
    this.props.updateProfileDraft(key, e.target.value)
  }

  onXhrUploadSuccess(res, onSuccess, file) {
    const { response } = res.data;
    const result = {
      uid: response.uid,
      url: getCachedImage(response.link),
      name: response.name,
      link: response.link,
      status: 'done'
    }
    onSuccess(result, file);
  }

  onXhrUploadFail(e) {
    if (e && e.response && e.response.data && e.response.data.error) {
      notification['error']({ message: e.response.data.error });
    } else {
      console.error(e);
      notification['error']({ message: 'Upload failed, please check your Internet connection.' });
    }
  }

  xhrUpload = ({ file, onSuccess }) => {
    uploadImage(
      file,
      (res) => this.onXhrUploadSuccess(res, onSuccess, file),
      this.onXhrUploadFail,
    )
  }

  handleUploadChange(props, key) {
    if (props.file.status === 'uploading') {
      this.setState({ [`${key}_loading`]: true });
      return;
    }

    if (props.file.status === 'done') {
      this.setState({
        [key]: props.file.response.url,
        [`${key}_loading`]: false
      }, () => this.props.updateProfileDraft(key, props.file.response.url))
    }
  }

  handleSubmit = (e) => {
    e.preventDefault();

    this.props.form.validateFields((errors, values) => {
      if (errors) {
        return notification['error']({ message: errors[Object.keys(errors)[0]]['errors'][0]['message'] });
      } else {
        this.openSubmit();
      }
    });
  }

  openSubmit = () => {
    const { profileDraft, me, myAccount, history, refreshMe } = this.props;
    let profile = myAccount.json_metadata.profile;
    if (!profile) {
      profile = { name: '', about: '', website: '', cover_image: '', profile_image: '' };
    }

    const values = {
      name: profileDraft.name || profile.name,
      about: profileDraft.about || profile.about,
      website: profileDraft.website || profile.website,
      cover_image: profileDraft.cover_image || profile.cover_image,
      profile_image: profileDraft.profile_image || profile.profile_image
    };

    const popupOption = 'height=650,width=500,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes';
    this.setState({ submitLoading: true }, () => {
      const win = window.open(SteemConnect.sign('profile-update', values), 'popUpWindow', popupOption, '_blank');
      win.focus();
      var timer = setInterval(function (me, history, refreshMe) {
        if (win.closed) {
          clearInterval(timer);
          refreshMe();
          history.push(`/`);
          history.push(`/author/@${me}`);
        }
      }, 500, me, history, refreshMe);
    });
  }

  renderImageOrButton(imageUrl, uploading) {
    if (uploading || !imageUrl) {
      return (
        <div className="uploader-placeholder">
          <Icon type={uploading ? 'loading' : 'plus'} />
          <div className="ant-upload-text">Upload</div>
        </div>
      )
    }

    return <img key={imageUrl} src={imageUrl} alt="profile_image" />;
  }

  render() {
    const { match, myAccount } = this.props;

    if (!this.props.me) {
      return (<Spin className="center-loading" />);
    }

    if (this.props.me && match.params.author !== this.props.me) {
      return (
        <div className="heading left-padded">
          <h3>Forbidden</h3>
          <div className="heading-sub">
            You don&#39;t have permission to edit this profile.
          </div>
        </div>
      );
    }

    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: {
        lg: { span: 24 },
        xl: { span: 6 },
      },
      wrapperCol: {
        lg: { span: 24 },
        xl: { span: 18 },
      },
    };
    const formItemLayoutWithOutLabel = {
      wrapperCol: {
        lg: { span: 24, offset: 0 },
        xl: { span: 18, offset: 6 },
      },
    };

    let profile = myAccount.json_metadata.profile || {};
    const profileImage = this.state.profile_image || profile.profile_image;
    const coverImage = this.state.cover_image || profile.cover_image;

    return (
      <Form onSubmit={this.handleSubmit} className="post-form">
        <FormItem
          {...formItemLayout}
          label="Name"
        >
          {getFieldDecorator('name', {
            validateTrigger: ['onBlur'],
            initialValue: profile.name
          })(
            <Input
              placeholder="your name"
              onChange={(e) => this.handleChange(e, 'name')} />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="About"
        >
          {getFieldDecorator('about', {
            validateTrigger: ['onBlur'],
            initialValue: profile.about
          })(
            <Input.TextArea
              rows={4}
              maxLength={80}
              placeholder="about yourself"
              onChange={(e) => this.handleChange(e, 'about')} />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="Website"
        >
          {getFieldDecorator('website', {
            validateTrigger: ['onBlur'],
            initialValue: profile.website,
            rules: [
              { pattern: urlRegExp, message: 'Website address is invalid.' },
            ],
          })(
            <Input
              placeholder="https://steemit.com"
              onChange={(e) => this.handleChange(e, 'website')} />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="Cover Photo"
        >
          {getFieldDecorator('cover_image', {
            validateTrigger: ['onBlur'],
            initialValue: coverImage
          })(
            <Upload
              name="cover_image"
              accept="image/x-png,image/jpeg"
              listType="picture-card"
              className="singular-uploader large"
              showUploadList={false}
              customRequest={this.xhrUpload}
              onChange={(props) => this.handleUploadChange(props, 'cover_image')}
              beforeUpload={(file, fileList) => validateImage(file)}
            >
              {this.renderImageOrButton(coverImage, this.state.cover_image_loading)}
            </Upload>
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="Profile Picture"
        >
          {getFieldDecorator('profile_image', {
            validateTrigger: ['onBlur'],
            initialValue: profileImage
          })(
            <Upload
              name="profile_image"
              accept="image/x-png,image/jpeg"
              listType="picture-card"
              className="singular-uploader small"
              showUploadList={false}
              customRequest={this.xhrUpload}
              onChange={(props) => this.handleUploadChange(props, 'profile_image')}
              beforeUpload={(file, fileList) => validateImage(file)}
            >
              {this.renderImageOrButton(profileImage, this.state.profile_image_loading)}
            </Upload>
          )}
        </FormItem>
        <FormItem {...formItemLayoutWithOutLabel}>
          <Button
            type="primary"
            htmlType="submit"
            loading={this.state.submitLoading}
            className="submit-button pull-right round-border padded-button"
          >
            UPDATE
          </Button>
        </FormItem>
      </Form>
    )
  }
}

const WrappedProfileForm = Form.create()(ProfileForm);

const mapStateToProps = () => createStructuredSelector({
  me: selectMe(),
  profileDraft: selectProfileDraft(),
  myAccount: selectMyAccount(),
});

const mapDispatchToProps = (dispatch, props) => ({
  updateProfileDraft: (field, value) => dispatch(updateProfileDraft(field, value)),
  resetProfileDraft: () => dispatch(resetProfileDraft()),
  refreshMe: () => dispatch(refreshMeBegin())
});

export default connect(mapStateToProps, mapDispatchToProps)(WrappedProfileForm);

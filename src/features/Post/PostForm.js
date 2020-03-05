import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { Form, Input, Icon, Button, Modal, Spin, Switch, notification } from 'antd';
import { selectDraft, selectIsPublishing } from './selectors';
import { selectMe, selectMyAccount } from 'features/User/selectors';
import { publishContentBegin } from './actions/publishContent';
import { updateDraft, resetDraft } from './actions/updateDraft';
import { initialState } from './actions';
import { timeUntilMidnightSeoul } from 'utils/date';
import api from 'utils/api';
import { selectCurrentPost } from './selectors';
import { getPostBegin, setCurrentPostKey } from './actions/getPost';
import { sanitizeText, splitTags } from './utils';
import { getCachedImage, stripCachedURL } from 'features/Post/utils';
import CustomUploadDragger from 'components/CustomUploadDragger';
import { uploadImage, validateImage } from 'utils/helpers/uploadHelpers';
import { formatNumber } from 'utils/helpers/steemitHelpers';

const FormItem = Form.Item;

class PostForm extends Component {
  static propTypes = {
    me: PropTypes.string.isRequired,
    myAccount: PropTypes.object.isRequired,
    draft: PropTypes.object.isRequired,
    updateDraft: PropTypes.func.isRequired,
    resetDraft: PropTypes.func.isRequired,
    publishContent: PropTypes.func.isRequired,
    isPublishing: PropTypes.bool.isRequired,
  };

  shouldConvertHunt() {
    return window.safeStorage.getItem('shouldConvertHunt') === 'true'
  }

  constructor(props) {
    super(props);

    this.state = {
      editMode: false,
      resetted: false,
      previewImageVisible: false,
      previewImage: '',
      fileList: [],
      uploadError: null,
      duplicatedUrl: null,
      description: '',
      inlineUploading: false,
      defaultBeneficiary: null,
      shouldConvertHunt: this.shouldConvertHunt(),
    };
  }

  componentDidMount() {
    const { match: { params: { author, permlink } }, getPost, updateDraft, location } = this.props;
    const draftString = window.safeStorage.getItem('draft');

    // Edit mode
    if (author && permlink) {
      if (!!draftString) {
        let draft = JSON.parse(draftString);
        if (author === draft.author && permlink === draft.permlink) {
          // if there is saved window.safeStorage
          updateDraft('url', draft.url);
          updateDraft('title', draft.title);
          updateDraft('tagline', draft.tagline);
          updateDraft('description', draft.description);
          this.setState({
            description: draft.description || ''
          })
          updateDraft('tags', draft.tags);
          if (draft.images !== []) {
            updateDraft('images', draft.image);
            this.handleImageChange({ fileList: draft.images });
            this.prepareForEdit(draft);
          }
        } else {
          getPost(author, permlink);
        }
      } else {
        getPost(author, permlink);
      }
      this.setState({ editMode: true, resetted: false });

      // Fresh new post
    } else if (!draftString) {
      // if window.safeStorage does not exist
      this.checkAndResetDraft();

    // New post with draft
    } else {
      // if there is saved window.safeStorage
      let draft = JSON.parse(draftString);
      updateDraft('url', draft.url || '#');
      updateDraft('title', draft.title || 'Title');
      updateDraft('tagline', draft.tagline || 'Short Description');
      updateDraft('tags', draft.tags || []);
      updateDraft('description', draft.description || '');
      this.setState({
        description: draft.description || ''
      })
      if (draft.images !== []) {
        updateDraft('images', draft.image);
        this.handleImageChange({ fileList: draft.images });
        this.prepareForEdit(draft);
      }
      this.handleHuntConversion(this.shouldConvertHunt());
    }

    // Steemplus integration
    const params = new URLSearchParams(location.search);
    if (params.get('url')) {
      updateDraft('url', params.get('url'));
    }
    if (params.get('title')) {
      updateDraft('title', params.get('title'));
    }
    if (params.get('tagline')) {
      updateDraft('tagline', params.get('tagline'));
    }
    if (params.get('by')) {
      this.setState({ defaultBeneficiary: params.get('by') }, () => {
        this.handleHuntConversion(this.shouldConvertHunt());
      });
    }

    window.addEventListener("paste", this.onPasteEvent);

    window.onbeforeunload = function() {
      return "Leave site? Changes you made may not be saved.";
    }
  }

  componentWillUnmount() {
    const { match: { params: { author, permlink } }} = this.props;

    if (author && permlink) {
      this.props.resetDraft();
      window.safeStorage.removeItem('draft');
    } else {
      this.checkAndResetDraft();
    }
    window.removeEventListener("paste", this.onPasteEvent);
    window.onbeforeunload = null;
  }

  componentWillReceiveProps(nextProps) {
    const { match: { params: { author, permlink } } } = this.props;
    const nextAuthor = nextProps.match.params.author;
    const nextPermlink = nextProps.match.params.permlink;

    if (nextAuthor && nextPermlink) {
      if (author !== nextAuthor || permlink !== nextPermlink) {
        this.props.getPost(nextAuthor, nextPermlink);
      }
      this.setState({ editMode: true, resetted: false });

      if (this.props.draft.permlink !== nextProps.draft.permlink) {
        this.prepareForEdit(nextProps.draft);
      }
    } else {
      if (author && permlink) {
        this.props.resetDraft();
        window.safeStorage.removeItem('draft');
      } else if (!window.safeStorage.getItem('draft')) {
        this.setState({ editMode: false });
        this.checkAndResetDraft();
      }
    }

    if (nextProps.me) {
      this.saveAndUpdateDraft('author', this.props.me);
    }
  }

  onPasteEvent = (e) => {
    if (e.target.className === 'ant-input inline-uploader' && e.clipboardData && e.clipboardData.items) {
      const file = e.clipboardData.items[0].getAsFile();
      if (file) {
        this.inputUpload(e, file);
      }
    }
  }

  saveAndUpdateDraft = (field, value) => {
    this.props.updateDraft(field, value);

    // TODO: FIXME: HACK:
    // Should be a proper reducer callback
    setTimeout(() => {
      // Save into window.safeStorage
      window.safeStorage.setItem('draft', JSON.stringify(this.props.draft));
    });
  }

  checkAndResetDraft = () => {
    if (!this.state.resetted) {
      this.props.setCurrentPostKey(null);
      this.props.resetDraft();
      this.setState({ resetted: true, fileList: [] });
    }
  };

  prepareForEdit = (draft) => {
    this.saveAndUpdateDraft('permlink', draft.permlink);
    this.setState({
      fileList: draft.images.map((f, i) => f &&
        {
          uid: i,
          name: f.name,
          url: getCachedImage(f.link),
          status: 'done',
          link: f.link,
        }
      ),
    });
  };

  handleSubmit = (e) => {
    e.preventDefault();

    this.props.form.validateFieldsAndScroll();
    this.props.publishContent(this.state.editMode);
  };

  // MARK: - Custom Validators

  checkTags = (_, value, callback) => {
    const form = this.props.form;
    const tags = splitTags(form.getFieldValue('tags'));

    if (tags.length > 4) {
      callback('Please use only 4 tags');
    } else {
      this.handleTagsChange(tags);
      callback();
    }
  };

  checkImages = (_, value, callback) => {
    if (this.state.fileList.length > 0) {
      callback();
    } else {
      callback('You must upload at least one image');
    }
  };

  checkUrl = (_, value, callback) => {
    this.setState({ duplicatedUrl: null });

    if (!value || value.length === 0) {
      return callback();
    }

    if (this.state.editMode) {
      this.saveAndUpdateDraft('url', value);
      return callback();
    }

    api.get('/posts/exists.json', { url: value }, true).then((res) => {
      if (res.result === 'OK') {
        this.saveAndUpdateDraft('url', value);
        callback();
      } else {
        this.saveAndUpdateDraft('url', '#');
        if (res.url) {
          this.setState({ duplicatedUrl: res.url });
          callback('');
        } else {
          callback(res.result);
        }
      }
    }).catch(msg => {
      this.saveAndUpdateDraft('url', '#');
      callback('Service is temporarily unavailable, Please try again later.');
    });
  };

  handleImagePreviewCancel = () => this.setState({ previewVisible: false });
  handleImagePreview = (file) => {
    this.setState({
      previewImage: file.url || file.thumbUrl,
      previewVisible: true,
    });
  };

  // MARK: - Handle live updates

  handleTitleChange = (e) => this.saveAndUpdateDraft('title', sanitizeText(e.target.value, true) || initialState.draft.title);
  handleTaglineChange = (e) => this.saveAndUpdateDraft('tagline', sanitizeText(e.target.value, true) || initialState.draft.tagline);
  handleDescriptionChange = (e, text = null) => {
    this.setState({
      description: text || e.target.value
    }, () => this.saveAndUpdateDraft('description', sanitizeText(this.state.description) || initialState.draft.description));
  };
  handleImageChange = ({ file, fileList }) => {
    const images = fileList.map(function (f) {
      if (f.response && f.response.link) {
        return {
          name: f.response.name,
          link: f.response.link
        }
      } else if (f.name && f.link) { // Handle Edit
        return {
          name: f.name,
          link: stripCachedURL(f.link)
        }
      }
      return null;
    });
    // console.log(file, fileList);
    this.setState({ fileList: fileList.filter(f => f.status === "done" || f.status === "uploading") });
    this.saveAndUpdateDraft('images', images.filter(x => !!x));
  };
  handleTagsChange = (tags) => this.saveAndUpdateDraft('tags', tags);
  handleHuntConversion = (checked) => {
    const { defaultBeneficiary } = this.state;
    let beneficiaries = [];

    if (defaultBeneficiary) {
      beneficiaries.push({ account: defaultBeneficiary, weight: 200 });
    }

    if (checked) {
      beneficiaries.push({ account: 'steemhunt.fund', weight: 9000 });
    }

    this.setState({ shouldConvertHunt: checked }, () => window.safeStorage.setItem('shouldConvertHunt', checked));
    this.props.updateDraft('beneficiaries', beneficiaries);
  };

  initialValue = (field, defaultValue = null) => initialState.draft[field] === this.props.draft[field] ? defaultValue : this.props.draft[field];

  onXhrUploadSuccess = (res, onSuccess, file) => {
    const { response } = res.data;
    const result = {
      uid: response.uid,
      url: getCachedImage(response.link),
      name: response.name,
      link: response.link,
      status: 'done'
    };
    onSuccess(result, file);
  };

  getErrorMessage(e) {
    if (e && e.response && e.response.data && e.response.data.error) {
      return e.response.data.error;
    } else {
      console.error('Upload error', e);
      return 'Image upload failed. Please check your Internet connection.';
    }
  }

  onXhrUploadFail = (e, file) => {
    notification['error']({ message: this.getErrorMessage(e) });
    this.setState({ fileList: this.state.fileList.filter(f => f.name !== file.name) });
  };

  onXhrUploadProgress = (onProgress, total, loaded, file) => {
    onProgress({ percent: parseFloat(Math.round(loaded / total * 100).toFixed(2)) }, file);
  };

  xhrUpload = ({ file, onProgress, onSuccess}) => {
    // console.log(file, this.state.fileList, "=====xhrUpload=====");
    if (!uploadImage(
      file,
      (res) => this.onXhrUploadSuccess(res, onSuccess, file),
      (res) => this.onXhrUploadFail(res, file),
      ({total, loaded}) => this.onXhrUploadProgress(onProgress, total, loaded, file)
    )) {
      return false;
    }
  };

  onInlineUploadSuccess = (res) => {
    const { response } = res.data;
    const { selectionStart, innerHTML } = this.descriptionRef.textAreaRef;
    const text = innerHTML.slice(0, selectionStart)
      + `![${response.name}](${getCachedImage(response.link)})`
      + innerHTML.slice(selectionStart + 1);
    this.handleDescriptionChange(null, text);
  };

  onInlineUploadFail = (e) => {
    notification['error']({ message: this.getErrorMessage(e) });
  };

  inputUpload = (e, uploadingFile = null) => {
    const file = uploadingFile || e.target.files[0];
    this.setState({ inlineUploading: true }, () => {
      uploadImage(file, this.onInlineUploadSuccess, this.onInlineUploadFail)
      .then(() => this.setState({ inlineUploading: false }));
    });
  };

  render() {
    const { me, myAccount, post } = this.props;
    const { shouldConvertHunt } = this.state;

    if (!me) {
      return (<Spin className="center-loading" />);
    }

    if (post && post.author !== me) {
      return (
        <div className="heading left-padded">
          <h3>Forbidden</h3>
          <div className="heading-sub">
            You don&#39;t have permission to edit this post.
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

    return (
      <Form onSubmit={this.handleSubmit} className="post-form">
        <div className="guideline"><a href="https://github.com/Steemhunt/web/blob/master/POSTING_GUIDELINES.md" target="_blank" rel="noopener noreferrer">Posting Guidelines</a></div>
        <FormItem
          {...formItemLayout}
          label="Product Link"
        >
          {getFieldDecorator('url', {
            validateTrigger: ['onBlur'],
            initialValue: this.initialValue('url'),
            rules: [
              { required: true, message: 'Product link cannot be empty', whitespace: true },
              { validator: this.checkUrl },
            ],
          })(
            <Input placeholder="https://steemit.com" />
          )}
          {this.state.duplicatedUrl &&
            <div className="ant-form-explain">
              The product link already exists&nbsp;
              <a href={this.state.duplicatedUrl} target="_blank" rel="noopener noreferrer">(Link)</a>.
            </div>
          }
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="Name of Product"
        >
          {getFieldDecorator('title', {
            initialValue: this.initialValue('title'),
            rules: [{ required: true, message: 'Name cannot be empty', whitespace: true }],
          })(
            <Input
              placeholder="Steemit"
              maxLength="30"
              onChange={this.handleTitleChange} />
          )}
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="Short Description"
          help="Describe what you’re posting in 60 characters or less."
        >
          {getFieldDecorator('tagline', {
            initialValue: this.initialValue('tagline'),
            rules: [{ required: true, message: 'Short description cannot be empty', whitespace: true }],
          })(
            <Input
              placeholder="A social media where everyone gets paid for participation"
              maxLength="60"
              onChange={this.handleTaglineChange}
            />
          )}
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="Images"
        >
          <div className="dropbox">
            {getFieldDecorator('images', {
              rules: [{ validator: this.checkImages }],
            })(
              <CustomUploadDragger name="image"
                customRequest={this.xhrUpload}
                listType="picture-card"
                fileList={this.state.fileList}
                onPreview={this.handleImagePreview}
                onChange={this.handleImageChange}
                multiple={true}
                accept="image/x-png,image/gif,image/jpeg"
                beforeUpload={(file, fileList) => validateImage(file)}
              >
                <p className="ant-upload-drag-icon">
                  <Icon type="inbox" />
                </p>
                <p className="ant-upload-hint">Click or drag image(s) to this area to upload (5MB Max)</p>
              </CustomUploadDragger>
            )}
            {this.state.uploadError &&
              <div className="error">{this.state.uploadError}</div>
            }
          </div>
          <Modal visible={this.state.previewVisible} footer={null} onCancel={this.handleImagePreviewCancel} className="preview-modal" centered>
            {
              /\.mp4$/.test(this.state.previewImage) ?
                <video key={this.state.previewImage} alt="Preview" playsInline autoPlay="autoplay" muted loop>
                  <source src={this.state.previewImage} />
                </video> :
                <img key={this.state.previewImage} alt="Preview" src={this.state.previewImage} />
            }
          </Modal>
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="Hunter's comment"
          extra={`${this.props.draft.description.length} / 1000`}
          className="description"
        >
          <Input.TextArea
            className={"inline-uploader"}
            ref={(ref) => { this.descriptionRef = ref }}
            placeholder="Comment on this product..."
            rows={4}
            value={this.state.description || this.initialValue('description')}
            onChange={this.handleDescriptionChange}
            maxLength={1000} />
          <div className="inline-upload-container">
            <span onClick={() => this.inlineFileField.click()} className="fake-link">Upload Image</span>
            {this.state.inlineUploading && <Icon type="loading" spin="true" />}
            <input type="file" ref={(ref) => { this.inlineFileField = ref }} onChange={this.inputUpload} accept="image/x-png,image/jpeg" />
          </div>
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="Tags"
        >
          {getFieldDecorator('tags', {
            validateTrigger: ['onChange', 'onBlur'],
            initialValue: this.initialValue('tags', []).join(' '),
            rules: [{ validator: this.checkTags }],
          })(
            <Input
              placeholder="Up to 4 tags, separated by a space"
            />
          )}
        </FormItem>

        {!this.state.editMode &&
          <FormItem
            {...formItemLayout}
            label="Boost HUNT"
            help={`Current conversion rate: 1 STU = ${formatNumber(myAccount.stu_hunt_rate)} HUNT`}
          >
            <Switch onChange={this.handleHuntConversion} defaultChecked={shouldConvertHunt} />
            &nbsp; Convert STEEM and SBD from this post into HUNT rewards
          </FormItem>
        }

        {!this.state.editMode &&
          <FormItem {...formItemLayoutWithOutLabel}>
            <p className="text-small top-margin">
              10% beneficiaries will be used for Steemhunt operation.
              <br/>
              {timeUntilMidnightSeoul()}
            </p>
          </FormItem>
        }

        <FormItem {...formItemLayoutWithOutLabel}>
          <Button
            type="primary"
            htmlType="submit"
            className="submit-button pull-right round-border padded-button"
            loading={this.props.isPublishing}
          >
            {this.state.editMode ? 'UPDATE POST' : 'POST NOW'}
          </Button>
        </FormItem>
      </Form>
    );
  }
}

const WrappedPostForm = Form.create()(PostForm);

const mapStateToProps = () => createStructuredSelector({
  me: selectMe(),
  myAccount: selectMyAccount(),
  draft: selectDraft(),
  post: selectCurrentPost(),
  isPublishing: selectIsPublishing(),
});

const mapDispatchToProps = (dispatch, props) => ({
  getPost: (author, permlink) => dispatch(getPostBegin(author, permlink, true)),
  setCurrentPostKey: key => dispatch(setCurrentPostKey(key)),
  updateDraft: (field, value) => dispatch(updateDraft(field, value)),
  resetDraft: () => dispatch(resetDraft()),
  publishContent: (editMode) => dispatch(publishContentBegin(props, editMode)),
});

export default connect(mapStateToProps, mapDispatchToProps)(WrappedPostForm);


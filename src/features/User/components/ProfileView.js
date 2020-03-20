import React, { Component } from 'react';
import UserSteemPower from 'features/User/components/UserSteemPower';
import UserEstimatedValue from 'features/User/components/UserEstimatedValue';
import FollowerCount from 'features/User/components/FollowerCount';
import LevelBar from 'features/User/components/LevelBar';
import CircularProgress from 'components/CircularProgress';
import { COLOR_PRIMARY, COLOR_LIGHT_GREY } from 'styles/constants';
import isEmpty from 'lodash/isEmpty';
import { Helmet } from 'react-helmet';
import { Icon, Timeline, Button } from 'antd';
import { Link } from 'react-router-dom';
import { getCachedImage } from 'features/Post/utils';
import profilePlaceholder from 'assets/images/profile-placeholder@2x.png';
import { getRoleName, getRoleBoost } from 'features/User/utils';
import { isValidUrl } from 'utils/helpers/stringHelpers';

export default class ProfileView extends Component {
  render() {
    const { me, account, onEditing, profileDraft } = this.props;

    if (isEmpty(account) || (onEditing && account.name !== me)) {
      return <CircularProgress />;
    }

    const isMyProfile = account.name === me;
    const roleName = getRoleName(account.name);
    const roleBoost = getRoleBoost(account);

    let profile = account.json_metadata.profile || {};
    let coverStyle;
    const profileStyle = {
      backgroundColor: COLOR_LIGHT_GREY,
      backgroundImage: `url(${profilePlaceholder})`,
    };

    const profileName = onEditing ? (profileDraft.name || profile.name) : (profile.name && profile.name !== 'undefined' ? profile.name : account.name);
    const profileAbout = onEditing ? (profileDraft.about || profile.about) : profile.about ;
    const profileWebsite = onEditing ? (profileDraft.website || profile.website) : profile.website ;
    const profileImage = onEditing ? (profileDraft.profile_image || profile.profile_image) : profile.profile_image;
    const coverImage = onEditing ? (profileDraft.cover_image || profile.cover_image) : profile.cover_image;

    if (profileImage) {
      profileStyle['backgroundImage'] = `url(${profileImage}?s=280)`;
    }

    if (coverImage) {
      coverStyle = {
        backgroundColor: COLOR_PRIMARY,
        backgroundImage: `url(${getCachedImage(coverImage, 1600, 800)})`,
        backgroundSize: 'cover',
      };
    }

    return (
      <div className="profile diagonal-split-view">
        {onEditing ?
          <Helmet>
            <title>@{account.name} - Editing</title>
          </Helmet> :
          <Helmet>
            <title>@{account.name} - Steemhunt</title>

            { /* Search Engine */}
            <meta name="description" content={profileAbout} />
            <meta name="image" content={`${profileImage}?s=1200`} />
            { /* Schema.org for Google */}
            <meta itemprop="name" content={`@${account.name} - Steemhunt`} />
            <meta itemprop="description" content={profileAbout} />
            <meta itemprop="image" content={`${profileImage}?s=1200`} />
            { /* Twitter */}
            <meta name="twitter:title" content={`@${account.name} - Steemhunt`} />
            <meta name="twitter:description" content={profileAbout} />
            <meta name="twitter:image:src" content={`${profileImage}?s=1200`} />
            { /* Open Graph general (Facebook, Pinterest & Google+) */}
            <meta property="og:title" content={`@${account.name} - Steemhunt`} />
            <meta property="og:description" content={profileAbout} />
            <meta property="og:image" content={`${profileImage}?s=1200`} />
          </Helmet>
        }
        <div className="top-container primary-gradient" style={coverStyle}>
          <h1>{profileName}</h1>
          <h2>{profileAbout}</h2>
        </div>
        <div className="diagonal-line"></div>
        <div className="bottom-container">
          <div className="profile-picture" style={profileStyle}></div>
          <div className="profile-level">
            {account.detailed_user_score != null &&
              <LevelBar scores={account.detailed_user_score} />
            }
          </div>
          <div className="timeline-container">
            <ul className="left">
              {isMyProfile && roleName !== 'User' && <li>Community Role</li>}
              <li>Reputation</li>
              <li>Followers</li>
              <li>Steem Power</li>
              <li>Estimated Value</li>
            </ul>

            <Timeline>
              {isMyProfile && roleName !== 'User' && <Timeline.Item>{roleName} (x{roleBoost} voting boost)</Timeline.Item>}
              <Timeline.Item>
                {account.reputation}
              </Timeline.Item>
              <Timeline.Item><FollowerCount author={account.name} unit="followers" /></Timeline.Item>
              <Timeline.Item>
                <UserSteemPower account={account} />
                {me === account.name &&
                  <a href={`https://steemitwallet.com/@${account.name}/transfers`} target="_blank" rel="noopener noreferrer" alt="Claim Steem Reward on your Steem wallet">
                    <Icon type="wallet" /> Steem Wallet
                  </a>
                }
              </Timeline.Item>
              <Timeline.Item><UserEstimatedValue account={account} /></Timeline.Item>
            </Timeline>
          </div>

          <div className="other-info">
            {isValidUrl(profileWebsite) &&
              <p><a href={profileWebsite} target="_blank" rel="noopener noreferrer" alt="Go to website"><Icon type="link" /> {profileWebsite.replace(/^https?:\/\//, '')}</a></p>
            }
            <p><Icon type="book" /> <a href={`https://steemit.com/@${account.name}`} target="_blank" rel="noopener noreferrer" alt="View Steemit blog">View Steemit blog</a></p>
          </div>
        </div>
      </div>
    )
  }
}
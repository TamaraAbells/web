/* eslint-disable no-param-reassign,no-empty */
import React from 'react';
import sanitizeHtml from 'sanitize-html';
import { Remarkable } from 'remarkable';
import emojione from 'emojione';
import embedjs from 'embedjs';
import sanitizeConfig from './helpers/SanitizeConfig';
import htmlReady from './helpers/steemitHtmlReady';
import PostFeedEmbed from './PostFeedEmbed';

const remarkable = new Remarkable({
  html: true, // remarkable renders first then sanitize runs...
  breaks: true,
  typographer: false, // https://github.com/jonschlinkert/remarkable/issues/142#issuecomment-221546793
  quotes: '“”‘’'
});

// Should return text(html) if returnType is text
// Should return Object(React Compatible) if returnType is Object
export function getHtml(body, jsonMetadata = {}, returnType = 'Object') {
  jsonMetadata.image = jsonMetadata.image || [];

  body = body.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)');

  const htmlReadyOptions = { mutate: true, resolveIframe: returnType === 'text' };
  body = remarkable.render(body);
  body = htmlReady(body, htmlReadyOptions).html;
  body = sanitizeHtml(body, sanitizeConfig({}));
  body = emojione.shortnameToImage(body);

  // Disable problematic images till Google fixes the fishing detection issue
  // https://d26i3uk99q2djv.cloudfront.net/items/3R1x3B383P0u3x1E2M01/steemhunt-collab-video.gif
  body = body.replace(/<img src="https:\/\/cl\.ly(.)+"\s*\/>/g, '');

  if (returnType === 'text') {
    return body;
  }

  const sections = [];
  let idx = 0;
  for (let section of body.split('~~~ embed:')) {
    const match = section.match(/^([A-Za-z0-9_-]+) ([A-Za-z]+) (\S+) ~~~/);
    if (match && match.length >= 4) {
      const id = match[1];
      const type = match[2];
      const link = match[3];
      const embed = embedjs.get(link.replace('&amp;', '&'), { width: '100%', height: 315, autoplay: true });

      sections.push(<PostFeedEmbed key={idx++} embed={embed} />);
      section = section.substring(`${id} ${type} ${link} ~~~`.length);
      if (section === '') continue;
    }
    sections.push(<div key={idx++} dangerouslySetInnerHTML={{ __html: section }} />);
  }
  return sections;
}

export default (props) => {
  const htmlSections = getHtml(props.post.body, props.jsonMetadata);
  return <div>{htmlSections}</div>;
};

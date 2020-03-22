import { isModerator } from 'features/User/utils';

export const getCommentsChildrenLists = (content) => {
  let listsById = {};
  Object.keys(content).forEach((commentKey) => {
    listsById[commentKey] = content[commentKey].replies;
  });

  return listsById;
};

export const getRootCommentsList = (content) => {
  return Object.keys(content).filter((commentKey) => {
    return content[commentKey].depth === 1;
  });
};

export const shouldCommentVisible = function(comment, postAuthor, me) {
  // Hide spam comments from front-end
  const filteredAuthors = [
    // Steemhunt bot comments
    'steemhunt',
    // Hive spams
    'innerhive', 'sirvotesalot', 'z8teyb289qav9z', 'ngc',
    // Other spammers
    'florianopolis'
  ];

  let meta = null;
  try {
    meta = JSON.parse(comment.json_metadata);
  } catch(e) {}
  if (meta && meta.verified_by === comment.author && isModerator(comment.author) && !isModerator(me) && postAuthor !== me) {
    return false;
  }

  if (filteredAuthors.includes(comment.author)) {
    return false;
  }

  if (comment.body.match(/hive\.blog/)) { //Filter Hive spams
    return false;
  }

  return true;
};

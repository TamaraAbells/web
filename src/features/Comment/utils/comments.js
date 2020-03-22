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

export const shouldCommentVisible = function(comment) {
  // Hide spam comments from front-end
  const filteredAuthors = [
    // Bot comments
    'steemhunt', 'cheetah', 'artturtle', 'upvotebank',
    // Hive spams
    'innerhive', 'sirvotesalot', 'z8teyb289qav9z', 'ngc',
    // Other spammers
    'florianopolis',
    // Other bots
  ];

  if (filteredAuthors.includes(comment.author)) {
    return false;
  }

  if (comment.body.match(/hive\.blog/)) { //Filter Hive spams
    return false;
  }

  return true;
};

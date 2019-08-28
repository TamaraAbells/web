export function getSortOption(key) {
  let defaultOption = (key === 'profile' ? 'created' : 'hunt_score');
  if (key === 'daily--1') {
    defaultOption = 'random';
  }

  if (window.sortOption && window.sortOption[key]) {
    return window.sortOption[key];
  }

  return defaultOption;
}
export function setSortOption(key, value) {
  window.sortOption = window.sortOption || {};
  window.sortOption[key] = value;
}


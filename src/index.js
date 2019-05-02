import bugsnag from 'bugsnag-js';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { unregister } from './registerServiceWorker';
import steem from 'steem';
import './utils/helpers/immutabilityHelpers';
import store from './store';
import App from './features/App/App';
import createPlugin from 'bugsnag-react';
require('./utils/polyfill');

const bugsnagClient = bugsnag(process.env.REACT_APP_BUGSNAG_KEY);
const ErrorBoundary = bugsnagClient.use(createPlugin(React));

steem.api.setOptions({ url: process.env.REACT_APP_STEEM_API_URL });

window.API_ROOT = process.env.REACT_APP_API_ROOT;

ReactDOM.render(
  <ErrorBoundary>
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </ErrorBoundary>,
  document.getElementById('root')
);

unregister();

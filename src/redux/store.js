import { applyMiddleware, createStore } from 'redux';
import logger from 'redux-logger';


import rootReducer from './root-reducer';
const middleware = [logger];
const store = createStore(rootReducer, applyMiddleware(...middleware) + window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());
export default store;
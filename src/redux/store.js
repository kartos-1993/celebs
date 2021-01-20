import { applyMiddleware, createStore } from 'redux';
import logger from 'redux-logger';


<<<<<<< HEAD
import rootReducer from './rootReducer';
const middleware = [logger];
const store = createStore(rootReducer, applyMiddleware(...middleware));
=======
import rootReducer from './root-reducer';
const middleware = [logger];
const store = createStore(rootReducer, applyMiddleware(...middleware) + window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
export default store;
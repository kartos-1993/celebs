import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";

<<<<<<< HEAD
console.log(store.getState());

=======
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
<<<<<<< HEAD
    </BrowserRouter>{" "}
=======
    </BrowserRouter>
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
  </Provider>,
  document.getElementById("root")
);

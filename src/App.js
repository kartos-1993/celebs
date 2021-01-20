import React from "react";

import "./App.css";

<<<<<<< HEAD
=======
import { connect } from "react-redux";

>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
import Homepage from "./pages/homepage/homepage.component";
import ShopPage from "./pages/shop/shop.component";
import Header from "./components/header/header.component";
import SignInSignUp from "./pages/sign-in-and-sign-out/sign-in-sign-up";
<<<<<<< HEAD
import Checkout from "./pages/checkout/checkout.component";

import { connect } from "react-redux";

import { Route, Switch, Redirect } from "react-router-dom";

import { createStructuredSelector } from "reselect";
import { selectCurrentUser } from "./redux/user/user.selectors";

import { setCurrentUser } from "./redux/user/user.actions";

import { auth, createUserProfileDocument } from "./firebase/firebase.util";
=======

import { Route, Switch } from "react-router-dom";

import { auth, createUserProfileDocument } from "./firebase/firebase.util";
import { setCurrentUser } from "./redux/user/user.actions";
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac

class App extends React.Component {
  unsubscribeFromAuth = null;

  componentDidMount() {
    const { setCurrentUser } = this.props;
    this.unsubscribeFromAuth = auth.onAuthStateChanged(async (userAuth) => {
      if (userAuth) {
<<<<<<< HEAD
        const userRef = await createUserProfileDocument(userAuth);

        userRef.onSnapshot((snapshot) => {
          setCurrentUser({
            id: snapshot.id,
            ...snapshot.data(),
          });
        });
      } else {
        setCurrentUser(userAuth);
=======
        //
        const userRef = await createUserProfileDocument(userAuth);

        //

        userRef.onSnapshot((snapshot) =>
          setCurrentUser({
            id: snapshot.id,
            ...snapshot.data(),
          })
        );
      } else {
        setCurrentUser({ userAuth });
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
      }
    });
  }

  componentWillUnmount() {
    this.unsubscribeFromAuth();
  }

  render() {
    return (
      <div>
<<<<<<< HEAD
        <Header />{" "}
        <Switch>
          <Route exact path="/" component={Homepage} />{" "}
          <Route path="/shop" component={ShopPage} />{" "}
          <Route
            exact
            path="/signin"
            render={() =>
              this.props.currentUser ? <Redirect to="/" /> : <SignInSignUp />
            }
          />{" "}
          <Route exact patch="/checkout" component={Checkout} />
=======
        <Header />
        <Switch>
          <Route exact path="/" component={Homepage} />{" "}
          <Route path="/shop" component={ShopPage} />{" "}
          <Route path="/signin" component={SignInSignUp} />{" "}
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
        </Switch>{" "}
      </div>
    );
  }
}

<<<<<<< HEAD
const mapSateToProps = createStructuredSelector({
  currentUser: selectCurrentUser,
});

=======
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
const mapDispatchToProps = (dispatch) => ({
  setCurrentUser: (user) => dispatch(setCurrentUser(user)),
});

<<<<<<< HEAD
export default connect(mapSateToProps, mapDispatchToProps)(App);
=======
export default connect(null, mapDispatchToProps)(App);
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac

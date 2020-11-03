import React from "react";
import SignIn from "../../components/sign-in/sign-in.component";
import SignUp from "../../components/signup/sign-up-component";
import "./sign-in-sign-up.styles.scss";

const SignInSignOut = () => (
  <div className="sign-in-and-sign-up">
    <SignIn></SignIn>
    <SignUp></SignUp>
  </div>
);

export default SignInSignOut;

import React from "react";
import "./sign-up.styles.scss";

import FormInput from "../form-input/form-input.component";
import CustomButton from "../custom-button/custom-button.component";
import { auth, createUserProfileDocument } from "../../firebase/firebase.util";

class SignUp extends React.Component {
  constructor() {
    super();

    this.state = {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    };
  }

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, confirmPassword, displayName } = this.state;
    if (password !== confirmPassword) {
      alert("Password do not match");
      return;
    }

    try {
      const { user } = await auth.createUserWithEmailAndPassword(
        email,
        password
      );

      await createUserProfileDocument(user, { displayName });

      this.setState({
        email: "",
        password: "",
        confirmPassword: "",
        displayName: "",
      });
    } catch (error) {
      console.log(error);
    }
  };

  render() {
    const { email, password, confirmPassword, displayName } = this.state;

    return (
      <div className="sign-up">
        <h1 className="title">I do not have a account.</h1>
        <span>Sign Up with your email and pasword</span>
        <form onSubmit={this.handleSubmit} className="sign-up-form">
          <FormInput
            name="displayName"
            type="text"
            label="User Name"
            onChange={this.handleChange}
            value={displayName}
          ></FormInput>
          <FormInput
            name="email"
            type="email"
            label="Email"
            onChange={this.handleChange}
            value={email}
          ></FormInput>
          <FormInput
            name="password"
            type="password"
            label="Password"
            onChange={this.handleChange}
            value={password}
          ></FormInput>
          <FormInput
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            onChange={this.handleChange}
            value={confirmPassword}
          ></FormInput>

          <CustomButton type="submit">SignUp</CustomButton>
        </form>
      </div>
    );
  }
}

export default SignUp;

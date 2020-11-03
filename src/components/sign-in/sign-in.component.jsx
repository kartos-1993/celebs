import React from "react";
import "./sign-in.styles.scss";
import FormInput from "../form-input/form-input.component";
import CustomButton from "../../components/custom-button/custom-button.component";
import { signInWithGoogle } from "../../firebase/firebase.util";

class SignIn extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: "",
      password: "",
    };
  }

  render() {
    const handleChange = (e) => {
      const { name, value } = e.target;
      this.setState({
        [name]: value,
      });
    };

    const onSubmit = (e) => {
      e.preventDefault();
      this.setState({ email: "", password: "" });
    };

    return (
      <div className="sign-in">
        <h1>I already have an account</h1>
        <span className="title">Sign in with your eamil and password</span>
        <form onSubmit={onSubmit}>
          <FormInput
            handleChange={handleChange}
            type="email"
            name="email"
            label="Email"
            required
            value={this.state.email}
          />

          <FormInput
            value={this.state.password}
            handleChange={handleChange}
            type="password"
            name="password"
            label="Password"
            required
          />
          <div className="button">
            <CustomButton type="submit">Sign In</CustomButton>
            <CustomButton onClick={signInWithGoogle} isGoogleSignIn>
              Sign in with Google
            </CustomButton>
          </div>
        </form>
      </div>
    );
  }
}

export default SignIn;

import React from "react";
import "./sign-in.styles.scss";
import FormInput from "../form-input/form-input.component";
import CustomButton from "../../components/custom-button/custom-button.component";
import { auth, signInWithGoogle } from "../../firebase/firebase.util";

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

    const onSubmit = async (e) => {
      e.preventDefault();

      const { email, password } = this.state;

      try {
        await auth.signInWithEmailAndPassword(email, password);
        this.setState({ email: "", password: "" });
      } catch (error) {
        console.log(error);
      }
    };

    return (
      <div className="sign-in">
        <h1>I already have an account</h1>
        <span className="title">Sign in with your eamil and password</span>

        <form onSubmit={onSubmit}>
          <FormInput
            required
            handleChange={handleChange}
            type="email"
            name="email"
            label="Email"
            value={this.state.email}
          />

          <FormInput
            required
            handleChange={handleChange}
            type="password"
            name="password"
            label="Password"
            value={this.state.password}
          />
          <div className="button">
            <CustomButton type="submit">Sign In</CustomButton>
            <CustomButton
              type="button"
              onClick={signInWithGoogle}
              isGoogleSignIn
            >
              Sign in with Google
            </CustomButton>
          </div>
        </form>
      </div>
    );
  }
}

export default SignIn;

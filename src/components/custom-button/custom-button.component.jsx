import React from "react";
import "./custom-button.styles.scss";

<<<<<<< HEAD
const CustomButton = ({
  children,
  isGoogleSignIn,
  inverted,
  ...otherProps
}) => {
  return (
    <button
      className={`${inverted ? "inverted" : ""}
      ${isGoogleSignIn ? "google-sign-in" : ""} custom-button`}
=======
const CustomButton = ({ children, isGoogleSignIn, ...otherProps }) => {
  return (
    <button
      className={`${isGoogleSignIn ? "google-sign-in" : ""} custom-button`}
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
      {...otherProps}
    >
      {children}
    </button>
  );
};

export default CustomButton;

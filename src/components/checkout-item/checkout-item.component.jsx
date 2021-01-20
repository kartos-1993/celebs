import React from "react";
import { connect } from "react-redux";

import { removeItem } from "../../redux/cart/cart.actions";

import "./checkout-item.styles.scss";

const CheckOutItem = ({ clearItem, cartItems }) => {
  const { name, imageUrl, quantity, price } = cartItems;
  return (
    <div className="checkout-item">
      <div className="image-container">
        <img alt="item" src={imageUrl} />
      </div>
      <span className="name">{name}</span>
      <span className="quantity">{quantity}</span>
      <span className="price">${price}</span>
      <div className="remove-button" onClick={() => clearItem(cartItems)}>
        &#10005;
      </div>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  clearItem: (item) => dispatch(removeItem(item)),
});

export default connect(null, mapDispatchToProps)(CheckOutItem);

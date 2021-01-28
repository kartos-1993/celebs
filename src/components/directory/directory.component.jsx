import React from "react";
import MenuItem from "../menu-item/menu-item.component";
import ShopPage from "../../pages/shop/shop.component";

import { createStructuredSelector } from "reselect";

import { selectDirectorySections } from "../../redux/directory/directory.selectors";

import "./directory.styles.scss";
import { connect } from "react-redux";

const Directory = ({ sections }) => (
  <div className="directory-menu">
    {sections.map(({ title, imageUrl, id, size }) => {
      return (
        <MenuItem key={id} title={title} imageUrl={imageUrl} size={size} />
      );
    })}
    <ShopPage />
  </div>
);

const mapStateToProps = createStructuredSelector({
  sections: selectDirectorySections,
});

export default connect(mapStateToProps)(Directory);

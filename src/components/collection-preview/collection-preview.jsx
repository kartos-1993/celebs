import React from "react";
import CollectionItem from "../../components/collection-item/collection-item.component";

import "./collection-preview.styles.scss";

const CollectionPreview = ({ title, items }) => (
  <div className="collection-preview">
    <h1 className="title">{title.toUpperCase()}</h1>
    <div className="preview">
      {items
        .filter((item, index) => index < 4)
        .map(({ id, ...otherItemProp }) => (
          <CollectionItem key={id} {...otherItemProp} />
        ))}
    </div>
  </div>
);

export default CollectionPreview;

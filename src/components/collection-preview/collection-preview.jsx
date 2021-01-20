import React from "react";
import CollectionItem from "../../components/collection-item/collection-item.component";

import "./collection-preview.styles.scss";

const CollectionPreview = ({ title, items }) => (
  <div className="collection-preview">
    <h1 className="title">{title.toUpperCase()}</h1>
    <div className="preview">
      {items
        .filter((item, index) => index < 4)
<<<<<<< HEAD
        .map((item) => (
          <CollectionItem key={item.id} item={item} />
=======
        .map(({ id, ...otherItemProp }) => (
          <CollectionItem key={id} {...otherItemProp} />
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
        ))}
    </div>
  </div>
);

export default CollectionPreview;

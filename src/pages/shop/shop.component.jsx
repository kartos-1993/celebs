import React from "react";
import { Route } from "react-router-dom";

import CollectionOverview from "../../components/collections-overview/collections-overview.compponent";
import CollectionPage from "../collectionPage/collection.components";

const ShopPage = ({ match }) => {
  console.log("Match", match);

  return (
    <div className="shop-page">
      <Route exact path={`${match.path}`} component={CollectionOverview} />
      <Route path={`${match.path}/:collectionId`} component={CollectionPage} />
    </div>
  );
};

export default ShopPage;

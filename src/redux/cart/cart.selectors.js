import { createSelector } from "reselect"


const selectCart = state => state.cart;


//cart Items selector
export const selectCartItems = createSelector(
    [selectCart],
    (cart) => cart.cartItems
)

//cart hide selector

export const selectCartHidden = createSelector(
    [selectCart],
    (cart) => cart.hidden

)

//cart Item count selector

export const selectCartItemCount = createSelector(
    [selectCartItems],
    cartItems => cartItems.reduce(
        (accumulatedQuantity, cartItem) => accumulatedQuantity + cartItem.quantity,
        0
    )

)

//cart Item total price selector

export const selectCartTotal = createSelector(
    [selectCartItems],
    cartItems => cartItems.reduce(
        (accumulatedQuantity, cartItem) => accumulatedQuantity + cartItem.quantity * cartItem.price,
        0
    )
)
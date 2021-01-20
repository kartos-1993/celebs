const INITIAL_STATE = {
    currentUser: null
}
<<<<<<< HEAD


=======
>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
const userReducer = (state = INITIAL_STATE, action) => {

    switch (action.type) {
        case 'SET_CURRENT_USER':
            return {
                ...state,
                currentUser: action.payload
            }

<<<<<<< HEAD

        default:
            return state;
    }
}

=======
        default:
            return state;

    }

}


>>>>>>> 37137a73dd46edd2bbe27377bc2dd42a622365ac
export default userReducer;
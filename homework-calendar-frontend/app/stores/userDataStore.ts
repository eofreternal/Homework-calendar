import { defineStore } from 'pinia'

export const useUserDataStore = defineStore('userData', {
    state: () => ({
        loggedIn: false,

        data: {
            username: "",
        }
    }),

    actions: {
        setLoggedIn(o: boolean) {
            this.loggedIn = o
        },

        setData(o: { username: string }) {
            this.data = o
        }
    }
})
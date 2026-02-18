import { defineStore } from 'pinia'
import { client } from '~/utils'
import type { InferResponseType } from 'hono';

export const useAssignmentsStore = defineStore('assignments', {
    state: () => ({
        fetchAssignmentsErrorMessage: null,

        classes: [],
        assignments: []
    } as {
        fetchAssignmentsErrorMessage: string | null,

        classes: Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"],
        assignments: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"]
    }),

    actions: {
        async fetchAssignments() {
            const today = new Date()
            const assignmentsRequest = await client.assignment.$get({
                query: {
                    endDate: Intl.DateTimeFormat("en-GB").format(new Date(today.getFullYear(), today.getMonth() + 1, 0)).split("/").reverse().join("-")
                }
            })
            const assignmentsJson = await assignmentsRequest.json()

            if (assignmentsJson.success == false) {
                this.fetchAssignmentsErrorMessage = assignmentsJson.data
                return
            } else {
                this.fetchAssignmentsErrorMessage = null
            }

            this.assignments = assignmentsJson.data
        },

        async fetchClasses() {
            const classesRequest = await client.classes.$get()
            const classesJson = await classesRequest.json()

            this.classes = classesJson.data
        },

        addAssignment(data: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"][number]) {
            this.assignments.push(data)
        },

        removeAssignment(id: number) {
            const index = this.assignments.findIndex(item => item.id == id)
            if (index == -1) {
                return
            }

            this.assignments.splice(index, 1)
        },

        updateAssignment(id: number, data: Partial<Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"][number]>) {
            const i = this.assignments.findIndex((item) => item.id == id)
            if (i == -1) { //Well, this is awkward. This shouldn't happen
                return
            }

            this.assignments[i]! = {
                ...this.assignments[i]!,
                ...data
            }
        },

        addClass(data: Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"][number]) {
            this.classes.push(data)
        },

        removeClass(id: number) {
            const index = this.classes.findIndex(item => item.id == id)
            if (index == -1) {
                return
            }

            this.classes.splice(index, 1)
        },

        updateClass(id: number, data: Partial<Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"][number]>) {
            const i = this.classes.findIndex((item) => item.id == id)
            if (i == -1) { //Well, this is awkward. This shouldn't happen
                return
            }

            this.classes[i]! = {
                ...this.classes[i]!,
                ...data
            }
        },
    }
})
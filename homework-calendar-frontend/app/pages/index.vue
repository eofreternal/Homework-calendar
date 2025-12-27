<script setup lang="ts">
import { client } from '~/utils';
import { useUserDataStore } from '~/stores/userDataStore';
import type { InferResponseType } from 'hono';
import type { FormSubmitEvent } from '@nuxt/ui'
import z from 'zod';
import { CalendarDate } from '@internationalized/date'

const userDataStore = useUserDataStore()
const toast = useToast()

const assignments = ref<Extract<InferResponseType<typeof client.assignment[":year"][":month"]["$get"]>, { success: true }>["data"]>([])

const today = new Date()
const oneDayInTheFuture = new Date()
oneDayInTheFuture.setDate(oneDayInTheFuture.getDate() + 1);
const createAssignmentStartDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate()))
const createAssignmentDueDate = shallowRef(new CalendarDate(oneDayInTheFuture.getFullYear(), oneDayInTheFuture.getMonth() + 1, oneDayInTheFuture.getDate()))
const createAssignmentZodSchema = z.object({
    title: z.string(),
    description: z.string(),
    type: z.union([z.literal("assignment"), z.literal("test/quiz")]),
})
type createAssignmentSchema = z.infer<typeof createAssignmentZodSchema>
const createAssignmentState = reactive<Partial<createAssignmentSchema>>({
    type: "assignment"
})

const viewCalendarDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth(), today.getDay()))
const calendarDays = computed(() => {
    const year = viewCalendarDate.value.year
    const month = viewCalendarDate.value.month - 1 // CalendarDate months start at 1. Date starts at 0

    const firstDate = new Date(year, month, 1)
    const lastDate = new Date(year, month + 1, 0)
    const daysInMonth = lastDate.getDate()
    const startingDayOfTheWeek = firstDate.getDay()

    const days = []
    for (let i = 0; i < startingDayOfTheWeek; i++) {
        days.push(null)
    }

    for (let i = 0; i < daysInMonth; i++) {
        days.push(i)
    }

    return days
})

onMounted(async () => {
    toast.add({
        color: "info",
        title: "Logging in..."
    })
    const login = await client.auth.login.$post({ json: { username: "Default User", password: "default" } })
    const json = await login.json()
    if (json.success == false) {
        toast.add({
            color: "error",
            title: "Something went wrong",
            description: json.data
        })
        return
    }
    toast.add({
        color: "success",
        title: "Logged in"
    })
    userDataStore.setLoggedIn(true)
    userDataStore.setData(json.data) //TODO: why does typescript think this can be undefined?

    const assignmentsRequest = await client.assignment[':year'][':month'].$get({
        param: {
            year: today.getFullYear().toString(),
            month: today.getMonth().toString()
        },
        query: {
            getCompletedOnly: undefined
        }
    })
    const assignmentsJson = await assignmentsRequest.json()

    if (assignmentsJson.success == false) { //TODO: why isn't hono infering the authentication middleware return type?
        toast.add({
            color: "error",
            title: "Something went wrong fetching pending assignments",
            description: assignmentsJson.data
        })
        return
    }

    assignments.value = assignmentsJson.data
})

function getEventsForDay(day: number | null) {
    if (day == null) {
        return []
    }

    return assignments.value.filter(d => {
        const dueDate = new Date(d.dueDate)
        if (dueDate.getDate() == day) {
            return true
        }
    })
}

async function onSubmitCreateAssignment(event: FormSubmitEvent<createAssignmentSchema>) {
    const create = await client.assignment.$post({
        json: {
            title: event.data.title,
            description: event.data.description,
            type: event.data.type,

            startDate: createAssignmentStartDate.value.toDate("est").getTime(),
            dueDate: createAssignmentDueDate.value.toDate("est").getTime()
        }
    })
    const response = await create.json()

    if (response.success == false) {
        toast.add({
            color: "error",
            title: "Something went wrong",
            description: response.data
        })
        return
    }

    toast.add({
        color: "success",
        title: "Created assignment!",
        description: "Hurray!!!"
    })
    assignments.value.push(response.data) //TODO: why is this infered as type | undefined?
    return
}

async function toggleAssignmentAsCompleted(id: number) {
    const item = assignments.value.find(work => work.id == id)
    if (item == undefined) {
        return
    }

    const value = item.completionDate ? null : Date.now()
    const request = await client.assignment[':id'].$patch({
        param: {
            id: id.toString()
        },
        json: {
            completionDate: value
        }
    })
    const response = await request.json()

    if (response.success == false) {
        toast.add({
            color: "error",
            title: "Something went wrong",
            description: response.data
        })
        return
    }

    let index;
    assignments.value.forEach((item, i) => {
        if (item.id == id) {
            assignments.value[i]!.completionDate = value
        }
        index = i
    })
    toast.add({
        color: "success",
        title: `${assignments.value[index!]!.title} marked as ${value ? 'completed' : "uncompleted"}!`
    })
}
</script>

<template>
    <main>
        <div>
            <header>
                <h1>Calendar - Showing assigments for {{
                    ["January", "February", "March", "April", "May", "June", "July",
                        "August", "September", "October", "November", "December"].at(viewCalendarDate.month) }}
                </h1>

                <UModal>
                    <UButton>Create assignment</UButton>

                    <template #content>
                        <UForm :schema="createAssignmentZodSchema" :state="createAssignmentState"
                            @submit="onSubmitCreateAssignment">

                            <UFormField label="Title">
                                <UInput placeholder="World History assignment" v-model="createAssignmentState.title" />
                            </UFormField>
                            <UFormField label="Description">
                                <UTextarea placeholder="For Mr. Smiths class"
                                    v-model="createAssignmentState.description" />
                            </UFormField>

                            <UFormField label="Start Date">
                                <UInputDate v-model="createAssignmentStartDate" />
                            </UFormField>

                            <UFormField label="Due Date">
                                <UInputDate v-model="createAssignmentDueDate" />
                            </UFormField>

                            <UButton loading-auto type="submit">
                                Submit
                            </UButton>
                        </UForm>
                    </template>
                </UModal>
            </header>

            <div class="calendar">
                <div class="weekday-headers">
                    <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">
                        {{ day }}
                    </div>
                </div>

                <div class="days-container">
                    <div class="day" v-for="day in calendarDays"
                        :class="{ 'has-assignments': getEventsForDay(day).length > 0 }">
                        {{ day }}
                    </div>
                </div>
            </div>
        </div>

        <aside>
            <UTabs :items="[
                {
                    label: 'Uncompleted',
                    slot: 'uncompleted'
                },
                {
                    label: 'Completed',
                    slot: 'completed'
                }
            ]">
                <template #uncompleted>
                    <UCard v-for="work in assignments" :key="work.id" v-show="work.completionDate == null">
                        <h1>{{ work.title }}</h1>
                        <p class="desc">{{ work.description }}</p>

                        <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
                        <UButton loading-auto @click="toggleAssignmentAsCompleted(work.id)">{{
                            work.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
                    </UCard>
                </template>

                <template #completed>
                    <UCard v-for="work in assignments" :key="work.id" v-show="work.completionDate !== null">
                        <h1>{{ work.title }}</h1>
                        <p class="desc">{{ work.description }}</p>

                        <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
                        <UButton loading-auto @click="toggleAssignmentAsCompleted(work.id)">{{
                            work.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
                    </UCard>
                </template>
            </UTabs>
        </aside>
    </main>
</template>

<style lang="scss" scoped>
main {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    padding-top: 2rem;

    header {
        h1 {
            font-weight: bold;
            font-size: 48px;
        }
    }

    .calendar {
        .weekday-headers {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;
        }

        .days-container {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;

            .day {
                display: border-box;

                padding: 0.5rem;
                min-height: 120px;
                max-width: 100%;

                &.has-assignments {
                    border: 1px solid green;
                }
            }
        }
    }

    aside {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        width: 16rem;

        .desc {
            color: grey;
            font-size: 16px;
        }
    }
}
</style>
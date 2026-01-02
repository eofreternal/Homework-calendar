<script setup lang="ts">
import { client, MONTHS } from '~/utils';
import { useUserDataStore } from '~/stores/userDataStore';
import type { InferResponseType } from 'hono';
import type { FormSubmitEvent } from '@nuxt/ui'
import z from 'zod';
import { CalendarDate } from '@internationalized/date'

const userDataStore = useUserDataStore()
const toast = useToast()

const showAssignmentsForDayState = reactive<{
    show: boolean,

    day: number,
    assignments: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"]
}>({
    show: false,

    day: 0,
    assignments: []
})

const oldAssignments = ref<Map<typeof MONTHS[number], Map<number, (Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"])>>>(new Map())
const assignments = ref<Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"]>([])
const showCreateClassModal = ref(false)
const showCreateAssignmentModal = ref(false)
const classes = ref<Extract<InferResponseType<typeof client.assignment.classes["$post"]>, { success: true }>["data"][]>([])

const today = new Date()
const oneDayInTheFuture = new Date()
oneDayInTheFuture.setDate(oneDayInTheFuture.getDate() + 1);
const createAssignmentStartDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate()))
const createAssignmentDueDate = shallowRef(new CalendarDate(oneDayInTheFuture.getFullYear(), oneDayInTheFuture.getMonth() + 1, oneDayInTheFuture.getDate()))
const createAssignmentEstimatedCompletionTimeHours = ref(1)
const createAssignmentEstimatedCompletionTimeMinutes = ref(0)
const createAssignmentZodSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.union([z.literal("assignment"), z.literal("test/quiz")]),
    class: z.union([z.string(), z.literal("No Class")])
})
type createAssignmentSchema = z.infer<typeof createAssignmentZodSchema>
const createAssignmentState = reactive<Partial<createAssignmentSchema>>({
    type: "assignment",
    class: "No Class"
})

const createClassZodSchema = z.object({
    name: z.string(),
})
type createClassSchema = z.infer<typeof createClassZodSchema>
const createClassState = reactive<Partial<createClassSchema>>({})

const viewCalendarDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth(), today.getDay()))
const calendarDays = computed(() => {
    const year = viewCalendarDate.value.year
    const month = viewCalendarDate.value.month - 1 // CalendarDate months start at 1. Date starts at 0

    const firstDate = new Date(year, month + 1, 1)
    const lastDate = new Date(year, month + 2, 0)
    const daysInMonth = lastDate.getDate()
    const startingDayOfTheWeek = firstDate.getDay()
    const days = []
    for (let i = 0; i < startingDayOfTheWeek; i++) {
        days.push(null)
    }

    for (let i = 0; i < daysInMonth; i++) {
        days.push(i + 1)
    }

    return days
})

function getEventsForDay(month: number, day: number | null) {
    if (day == null) {
        return []
    }

    return assignments.value.filter(d => {
        const dueDate = new Date(d.dueDate)
        if (dueDate.getDate() == day && dueDate.getMonth() == month) {
            return true
        }
    })
}

function findClassIdByClassName(name: string) {
    if (name == "No Class") {
        return undefined
    }

    return classes.value.find(value => {
        return value.name == name
    })?.id
}

async function onSubmitCreateAssignment(event: FormSubmitEvent<createAssignmentSchema>) {
    const classId = findClassIdByClassName(event.data.class)
    const estimatedCompletionMinutes = (createAssignmentEstimatedCompletionTimeHours.value * 60) + createAssignmentEstimatedCompletionTimeMinutes.value

    const create = await client.assignment.$post({
        json: {
            title: event.data.title,
            description: event.data.description,
            type: event.data.type,
            class: classId,
            estimatedCompletionMinutes: estimatedCompletionMinutes,

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
    assignments.value.push(response.data)
    showCreateAssignmentModal.value = false
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

async function onSubmitCreateClass(event: FormSubmitEvent<createClassSchema>) {
    const request = await client.assignment.classes.$post({
        json: {
            name: event.data.name
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

    classes.value.push(response.data)
    createAssignmentState.class = event.data.name
    showCreateClassModal.value = false
}

function convertMinutesToFormattedString(minutes: number) {
    const normalizedHours = Math.floor(minutes / 60)
    const normalizedMinutes = minutes % 60

    if (normalizedHours < 1) {
        return `${normalizedMinutes} minute${normalizedMinutes == 1 ? "" : "s"}`
    }

    if (normalizedMinutes < 1) {
        return `${normalizedHours} hour${normalizedHours == 1 ? "" : "s"}`
    }

    return `${normalizedHours} hour${normalizedHours == 1 ? "" : "s"} and ${normalizedMinutes} minute${normalizedMinutes == 1 ? "" : "s"}`
}

function showAssignmentsForDayFunc(day: number, assignments: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"]) {
    showAssignmentsForDayState.show = true

    showAssignmentsForDayState.day = day
    showAssignmentsForDayState.assignments = assignments
}

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
    userDataStore.setData(json.data)

    const assignmentsRequest = await client.assignment.$get({
        query: {
            endDate: Intl.DateTimeFormat("en-GB").format(new Date(today.getFullYear(), today.getMonth() + 1, 0)).split("/").reverse().join("-")
        }
    })
    const assignmentsJson = await assignmentsRequest.json()

    if (assignmentsJson.success == false) {
        toast.add({
            color: "error",
            title: "Something went wrong fetching pending assignments",
            description: assignmentsJson.data
        })
        return
    }

    assignments.value = assignmentsJson.data.sort((a, b) => b.completionDate! - a.completionDate!)

    const temp = assignmentsJson.data.filter(item => {
        if (new Date(item.dueDate).getMonth() !== today.getMonth()) {
            return true
        }

        return false
    })

    temp.forEach(item => {
        const dueDate = new Date(item.dueDate)
        const assignmentDueMonth = MONTHS[dueDate.getMonth()]!
        const monthData = oldAssignments.value.get(assignmentDueMonth)

        if (monthData === undefined) {
            oldAssignments.value.set(assignmentDueMonth, new Map([[dueDate.getDate(), [item]]]))
            return
        }

        const dateData = monthData.get(dueDate.getDate())
        if (dateData === undefined) {
            monthData.set(dueDate.getDate(), [item])
            return
        }
        monthData.set(dueDate.getDate(), [...dateData, item].sort((a, b) => b.completionDate! - a.completionDate!))
    })
})
</script>

<template>
    <main>
        <div>
            <header>
                <h1>Calendar - Showing assigments for {{
                    ["January", "February", "March", "April", "May", "June", "July",
                        "August", "September", "October", "November", "December"].at(viewCalendarDate.month) }}
                </h1>

                <UButton @click="showCreateAssignmentModal = true">Create assignment</UButton>

                <UModal v-model:open="showCreateAssignmentModal">
                    <template #content>
                        <UContainer class="create-assignment-wrapper">
                            <UForm :schema="createAssignmentZodSchema" :state="createAssignmentState"
                                @submit="onSubmitCreateAssignment" class="form">

                                <UFormField label="Title" required>
                                    <UInput placeholder="World History assignment"
                                        v-model="createAssignmentState.title" />
                                </UFormField>
                                <UFormField label="Description (optional)">
                                    <UTextarea placeholder="For Mr. Smiths class"
                                        v-model="createAssignmentState.description" />
                                </UFormField>

                                <UFormField label="Type" required>
                                    <USelect v-model="createAssignmentState.type" :items="['assignment', 'test/quiz']"
                                        class="w-48" />
                                </UFormField>

                                <UFormField label="Class (optional)">
                                    <USelect v-model="createAssignmentState.class"
                                        :items="[...classes.map(a => a.name), 'No Class']" class="w-48" />

                                    <UModal v-model:open="showCreateClassModal">
                                        <UButton @click="showCreateClassModal = true" label="Create class"
                                            color="neutral" variant="subtle" />

                                        <template #content>
                                            <UForm :schema="createClassZodSchema" :state="createClassState"
                                                @submit="onSubmitCreateClass">
                                                <UFormField label="Name">
                                                    <UInput placeholder="Science class"
                                                        v-model="createClassState.name" />
                                                </UFormField>

                                                <UButton type="submit">Create class</UButton>
                                            </UForm>
                                        </template>
                                    </UModal>
                                </UFormField>

                                <UFormField label="Estimated completion time"
                                    class="estimated-completetion-time-container" required>
                                    <UInputNumber v-model="createAssignmentEstimatedCompletionTimeHours" :min="0"
                                        :step="1" :format-options="{
                                            style: 'unit',
                                            unit: 'hour',
                                            unitDisplay: 'long',
                                        }" />

                                    <UInputNumber v-model="createAssignmentEstimatedCompletionTimeMinutes" :min="0"
                                        :max="60" :step="1" :format-options="{
                                            style: 'unit',
                                            unit: 'minute',
                                            unitDisplay: 'long',
                                        }" />
                                </UFormField>

                                <div class="dates-container" required>
                                    <UFormField label="Start Date">
                                        <UInputDate v-model="createAssignmentStartDate" />
                                    </UFormField>

                                    <UFormField label="Due Date">
                                        <UInputDate v-model="createAssignmentDueDate" />
                                    </UFormField>
                                </div>

                                <UButton loading-auto type="submit">
                                    Submit
                                </UButton>
                            </UForm>
                        </UContainer>
                    </template>
                </UModal>
            </header>

            <UContainer class="old-assignments-container">
                <div class="months">
                    <h1 v-for="month in oldAssignments.keys()">{{ month }}</h1>
                </div>

                <div class="assignments">
                    <template v-for="month in oldAssignments.keys()">
                        <div class="month-assignment">
                            <template v-for="days in oldAssignments.get(month)">
                                <div class="day" @click="() => showAssignmentsForDayFunc(days[0], days[1])">
                                    {{ days[0] }}
                                    <ul>
                                        <li v-for="(item, index) in days[1]" v-show="index < 3" :key="index"
                                            class="assignment"
                                            :class="{ 'strikethrough': item.completionDate !== null }">
                                            {{ item.title }}
                                        </li>
                                        <li v-if="days[1].length > 3">
                                            +{{ days[1].length - 3 }} more items
                                        </li>
                                    </ul>
                                </div>

                            </template>
                        </div>
                    </template>
                </div>
            </UContainer>

            <div class="calendar">
                <div class="weekday-headers">
                    <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">
                        {{ day }}
                    </div>
                </div>

                <div class="days-container">
                    <div class="day" v-for="day in calendarDays"
                        @click="() => { if (day !== null) { showAssignmentsForDayFunc(day, getEventsForDay(today.getMonth(), day)) } }"
                        :class="{ 'has-assignments': getEventsForDay(today.getMonth(), day).length > 0, 'today': new Date().getDate() == day }">
                        {{ day }}
                        <ul>
                            <li v-for="(item, index) in getEventsForDay(today.getMonth(), day)" v-show="index < 3"
                                :key="index" class="assignment"
                                :class="{ 'strikethrough': item.completionDate !== null }">
                                {{ item.title }}
                            </li>
                            <li v-if="getEventsForDay(today.getMonth(), day).length > 3">
                                +{{ getEventsForDay(today.getMonth(), day).length - 3 }} more items
                            </li>
                        </ul>
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
                        <br>
                        <p>Estimated time: {{ convertMinutesToFormattedString(work.estimatedCompletionMinutes) }}</p>
                        <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
                        <UButton loading-auto @click="toggleAssignmentAsCompleted(work.id)">{{
                            work.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
                    </UCard>
                </template>

                <template #completed>
                    <UCard v-for="work in assignments" :key="work.id" v-show="work.completionDate !== null">
                        <h1>{{ work.title }}</h1>
                        <p class="desc">{{ work.description }}</p>
                        <br>
                        <p>Estimated time: {{ convertMinutesToFormattedString(work.estimatedCompletionMinutes) }}</p>
                        <p>Date completed: {{ new Date(work.completionDate!).toLocaleDateString() }}</p>
                        <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
                        <UButton loading-auto @click="toggleAssignmentAsCompleted(work.id)">{{
                            work.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
                    </UCard>
                </template>
            </UTabs>

            <USlideover v-model:open="showAssignmentsForDayState.show"
                :title="'Assignments for ' + showAssignmentsForDayState.day">

                <template #body>
                    <UCard v-for="work in showAssignmentsForDayState.assignments" :key="work.id">
                        <h1>{{ work.title }}</h1>
                        <p class="desc">{{ work.description }}</p>
                        <br>
                        <p v-show="work.estimatedCompletionMinutes">Estimated time: {{
                            convertMinutesToFormattedString(work.estimatedCompletionMinutes)
                            }}
                        </p>
                        <p>Date completed: {{ new Date(work.completionDate!).toLocaleDateString() }}</p>
                        <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
                        <UButton loading-auto @click="toggleAssignmentAsCompleted(work.id)">{{
                            work.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
                    </UCard>
                </template>
            </USlideover>
        </aside>
    </main>
</template>

<style lang="scss" scoped>
.strikethrough {
    text-decoration: line-through;
}

.create-assignment-wrapper {
    padding: 1rem;

    .form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .dates-container {
            display: flex;
            flex-direction: row;
            gap: 0.5rem;
        }

        .estimated-completion-time-container {
            display: flex;
            flex-direction: row;
            gap: 0.5rem;
        }

        button {
            width: fit-content;
        }
    }
}

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

    .old-assignments-container {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: auto;
        gap: 1rem;

        .months {
            display: grid;
            grid-template-rows: auto;
            gap: 1rem;

            h1 {
                align-self: center;
                font-weight: bold;

                font-size: 3rem;
            }
        }

        .assignments {
            display: grid;
            grid-template-rows: auto;
            gap: 1rem;

            .month-assignment {
                display: flex;
                flex-direction: row;
                gap: 0.75rem;

                .day {
                    box-sizing: border-box;

                    padding: 0.5rem;
                    min-height: 120px;
                    width: 160px;
                    max-width: 100%;

                    border-radius: 8px;

                    overflow: hidden;

                    padding: 1rem;

                    border-radius: 12px;
                    border: 2px solid oklch(37.2% 0.044 257.287); //oklch(27.9% 0.041 260.031) darker

                    .assignment {
                        font-size: 12px;

                        max-width: 100%;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                }
            }
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
                box-sizing: border-box;

                padding: 0.5rem;
                min-height: 120px;
                max-width: 100%;

                border-radius: 8px;

                overflow: hidden;

                &.has-assignments {
                    border: 3px solid var(--ui-primary);
                }

                &.today {
                    border: 3px solid white;
                }

                .assignment {
                    font-size: 12px;

                    max-width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
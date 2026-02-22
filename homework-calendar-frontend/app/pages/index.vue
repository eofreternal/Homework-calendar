<script setup lang="ts">
import { client, MONTHS } from '~/utils';
import { useUserDataStore } from '~/stores/userDataStore';
import { useAssignmentsStore } from "~/stores/assignmentsStore"
import type { InferResponseType } from 'hono';
import type { FormSubmitEvent } from '@nuxt/ui'
import z from 'zod';
import { CalendarDate } from '@internationalized/date'
import { UPopover } from '#components'

const userDataStore = useUserDataStore()
const assignmentsStore = useAssignmentsStore()
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

const today = new Date()
const pageWidth = ref(0)
const mobileShowUpcomingAssignmentsSidebar = ref(false)
const mobileCurrentDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate()))

const oldAssignments = ref<Map<typeof MONTHS[number], Map<number, (Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"])>>>(new Map())
const assignments = ref<Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"]>([])
const showCreateClassModal = ref(false)
const showCreateAssignmentModal = ref(false)
const classes = ref<Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"]>([])

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

const viewCalendarDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDay()))
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
const eventsForDate = computed(() => {
    const events = new Map<number, Map<number, (typeof assignments.value[number])[]>>()

    for (const event of assignments.value) {
        const dueDate = new Date(event.dueDate)

        const month = dueDate.getMonth()
        const date = dueDate.getDate()

        const currentMonthValue = events.get(month)
        if (currentMonthValue === undefined) {
            events.set(month, new Map())
        } else {
            const currentDateValue = currentMonthValue.get(date)
            if (currentDateValue === undefined) {
                currentMonthValue.set(date, [event])
            } else {
                currentMonthValue.set(date, [...currentDateValue, event])
            }
        }
    }

    return events
})

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
    assignmentsStore.addAssignment(response.data)
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
            index = i
        }
    })

    assignmentsStore.updateAssignment(id, {
        ...assignments.value[index!]!,
        completionDate: value
    })

    toast.add({
        color: "success",
        title: `${assignments.value[index!]!.title} marked as ${value ? 'completed' : "uncompleted"}!`
    })
}

async function onSubmitCreateClass(event: FormSubmitEvent<createClassSchema>) {
    const request = await client.classes.$post({
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

    assignmentsStore.addClass(response.data)
    createAssignmentState.class = event.data.name
    showCreateClassModal.value = false
}

function showAssignmentsForDayFunc(day: number, assignments: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"]) {
    showAssignmentsForDayState.show = true

    showAssignmentsForDayState.day = day
    showAssignmentsForDayState.assignments = assignments
}

onMounted(async () => {
    pageWidth.value = window.innerWidth
    window.addEventListener('resize', function () {
        pageWidth.value = window.innerWidth
    });

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

    assignmentsStore.fetchAssignments()
    assignmentsStore.fetchClasses()
})

assignmentsStore.$subscribe((mutation, state) => {
    assignments.value = state.assignments.sort((a, b) => b.completionDate! - a.completionDate!)

    const temp = state.assignments.filter(item => {
        if (new Date(item.dueDate).getMonth() !== today.getMonth()) {
            return true
        }

        return false
    })

    oldAssignments.value.clear()
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

    if (state.fetchAssignmentsErrorMessage !== null) {
        toast.add({
            color: "error",
            title: "Something went wrong fetching pending assignments",
            description: state.fetchAssignmentsErrorMessage
        })
    }
    classes.value = state.classes

    const ids = state.assignments.map(item => item.id)
    showAssignmentsForDayState.assignments.forEach((item, index) => {
        if (!ids.includes(item.id)) {
            showAssignmentsForDayState.assignments.splice(index, 1)
        }
    })
})
</script>

<template>
    <main>
        <div class="flex flex-col gap-4">
            <h1 class="text-2xl font-bold">Unfinished assignments from previous months</h1>
            <UContainer class="old-assignments-container">
                <template v-if="pageWidth > 1000">
                    <div class="months">
                        <h1 v-for="month in oldAssignments.keys()">{{ month }}</h1>
                    </div>

                    <div class="assignments">
                        <template v-for="month in oldAssignments.keys()">
                            <div class="month-assignment">
                                <template v-for="days in oldAssignments.get(month)">
                                    <Date :day="days[0]" :assignments-for-day="days[1]"
                                        @show-assignments-for-day="showAssignmentsForDayFunc" />
                                </template>
                            </div>
                        </template>
                    </div>
                </template>

                <UPopover v-else class="assignments" v-for="monthName in oldAssignments.keys()">
                    <UButton color="neutral" variant="subtle" class="monthName">
                        <h1>{{ monthName }}</h1>
                    </UButton>
                    <template #content>
                        <template v-for="month in oldAssignments.keys()">
                            <div class="month-assignment">
                                <template v-for="days in oldAssignments.get(month)">
                                    <Date :day="days[0]" :assignments-for-day="days[1]"
                                        @show-assignments-for-day="showAssignmentsForDayFunc" />
                                </template>
                            </div>
                        </template>
                    </template>
                </UPopover>
            </UContainer>
            <USeparator />
            <!-- TODO: use HTML tables for better a11y -->
            <div class="desktop-calendar" v-if="pageWidth >= 1000">
                <header>
                    <h1>{{ MONTHS[viewCalendarDate.month - 1] }}</h1>

                    <UButton @click="showCreateAssignmentModal = true" class="absolute right-0 self-center">Create
                        assignment
                    </UButton>

                    <UModal title="Homework? Oh no TwT" v-model:open="showCreateAssignmentModal">
                        <template #body>
                            <div class="create-assignment-wrapper">
                                <UForm :schema="createAssignmentZodSchema" :state="createAssignmentState"
                                    @submit="onSubmitCreateAssignment" class="form">

                                    <UFormField label="Title" required>
                                        <UInput class="w-full" placeholder="World History assignment"
                                            v-model="createAssignmentState.title" />
                                    </UFormField>
                                    <UFormField label="Description (optional)">
                                        <UTextarea class="w-full" placeholder="For Mr. Smiths class"
                                            v-model="createAssignmentState.description" />
                                    </UFormField>

                                    <UFormField label="Type" required>
                                        <USelect v-model="createAssignmentState.type"
                                            :items="['assignment', 'test/quiz']" class="w-48" />
                                    </UFormField>

                                    <UFormField label="Class (optional)">
                                        <div class="flex gap-4">
                                            <USelect v-model="createAssignmentState.class"
                                                :items="[...classes.map(a => a.name), 'No Class']" class="w-48" />

                                            <UModal title="Create a class" v-model:open="showCreateClassModal">
                                                <UButton @click="showCreateClassModal = true" label="Create class"
                                                    color="neutral" variant="subtle" />

                                                <template #content>
                                                    <div class="p-4">
                                                        <UForm :schema="createClassZodSchema" :state="createClassState"
                                                            @submit="onSubmitCreateClass" class="flex flex-col gap-4">
                                                            <UFormField label="Name">
                                                                <UInput placeholder="Science class"
                                                                    v-model="createClassState.name" />
                                                            </UFormField>

                                                            <UButton class="w-fit" type="submit">Create class</UButton>
                                                        </UForm>
                                                    </div>
                                                </template>
                                            </UModal>
                                        </div>
                                    </UFormField>

                                    <UFormField label="Estimated completion time" required>
                                        <div class="flex gap-4">
                                            <UInputNumber v-model="createAssignmentEstimatedCompletionTimeHours"
                                                :min="0" :step="1" :format-options="{
                                                    style: 'unit',
                                                    unit: 'hour',
                                                    unitDisplay: 'long',
                                                }" />

                                            <UInputNumber v-model="createAssignmentEstimatedCompletionTimeMinutes"
                                                :min="0" :max="60" :step="1" :format-options="{
                                                    style: 'unit',
                                                    unit: 'minute',
                                                    unitDisplay: 'long',
                                                }" />
                                        </div>
                                    </UFormField>

                                    <div class="dates-container" required>
                                        <UFormField label="Start Date">
                                            <UInputDate v-model="createAssignmentStartDate" />
                                        </UFormField>

                                        <UFormField label="Due Date">
                                            <UInputDate v-model="createAssignmentDueDate" />
                                        </UFormField>
                                    </div>

                                    <UButton class="w-fit" loading-auto type="submit">
                                        Submit
                                    </UButton>
                                </UForm>
                            </div>
                        </template>
                    </UModal>
                </header>

                <div class="weekday-headers">
                    <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">
                        {{ day }}
                    </div>
                </div>

                <div class="days-container">
                    <Date v-for="day in calendarDays" :day="day"
                        :assignments-for-day="eventsForDate.get(today.getMonth())?.get(day) ?? []"
                        @show-assignments-for-day="showAssignmentsForDayFunc" />
                </div>
            </div>

            <div class="flex flex-col gap-4" v-else>
                <!-- Needed for the month watcher. Using the built in month controls don't work because they don't automatically choose a day in the month for you -->
                <div>
                    <UCalendar :month-controls="false" :year-controls="false" v-model="mobileCurrentDate" size="lg"
                        variant="subtle">
                        <template #day="{ day }">
                            <UChip :show="eventsForDate.get(day.month - 1)?.get(day.day) !== undefined"
                                :color="eventsForDate.get(day.month - 1)?.get(day.day) !== undefined ? 'success' : undefined"
                                size="2xs">
                                {{ day.day }}
                            </UChip>
                        </template>
                    </UCalendar>
                    <div class="flex justify-between gap-4">
                        <UButton class="pr-8 pl-8" color="neutral" variant="outline" size="lg"
                            @click="mobileCurrentDate = mobileCurrentDate.subtract({ months: 1 })">
                            Prev
                        </UButton>

                        <UButton class="pr-8 pl-8" color="neutral" variant="outline" size="lg"
                            @click="mobileCurrentDate = mobileCurrentDate.add({ months: 1 })">
                            Next
                        </UButton>
                    </div>
                </div>
                <USeparator />
                <div class="flex flex-col gap-4">
                    <Assignment
                        v-for="work in eventsForDate.get(mobileCurrentDate.month - 1)?.get(mobileCurrentDate.day) ?? []"
                        :assignment="work" @toggle-assignment="toggleAssignmentAsCompleted" />
                </div>
            </div>
        </div>

        <UButton class="toggle-sidebar"
            @click="mobileShowUpcomingAssignmentsSidebar = !mobileShowUpcomingAssignmentsSidebar"
            icon="material-symbols:assignment-outline" v-if="pageWidth < 1000" />
        <AssignmentsSidebar :assignments="assignments"
            v-show="(pageWidth > 1000) || mobileShowUpcomingAssignmentsSidebar" :mobile="pageWidth < 1000"
            :toggleAssignmentAsCompleted="toggleAssignmentAsCompleted" />

        <USlideover v-model:open="showAssignmentsForDayState.show"
            :title="'Assignments for ' + showAssignmentsForDayState.day">

            <template #body>
                <div class="slideover-container" v-auto-animate>
                    <Assignment class="w-full" v-for="work in showAssignmentsForDayState.assignments" :key="work.id"
                        :assignment="work" @toggle-assignment="toggleAssignmentAsCompleted(work.id)" />
                </div>
            </template>
        </USlideover>
    </main>
</template>


<style>
.monthName {
    width: fit-content;
}
</style>

<style lang="scss" scoped>
.slideover-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.create-assignment-wrapper {
    display: flex;
    flex-direction: row;
    gap: 1rem;

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
    padding-top: 1rem;

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
            }
        }
    }

    .desktop-calendar {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        header {
            position: relative;
            display: flex;
            justify-content: center;
        }

        .weekday-headers {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;
        }

        .days-container {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;
        }
    }

    .toggle-sidebar {
        position: fixed;
        bottom: 10px;
        right: 10px;

        z-index: 999;
    }
}
</style>
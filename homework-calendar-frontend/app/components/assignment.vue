<script setup lang="ts">
import { client } from '~/utils';
import { useAssignmentsStore } from "~/stores/assignmentsStore"
import z from 'zod';
import type { InferResponseType } from 'hono';
import type { FormSubmitEvent } from '@nuxt/ui'
import { CalendarDate } from '@internationalized/date'
const toast = useToast()

const props = defineProps<{
    assignment: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"][number]
}>()

const emit = defineEmits<{
    (event: 'toggleAssignment', day: number): void;
}>();

const showEditAssignmentModal = ref(false)
const showDeleteAssignmentModal = ref(false)
const assignmentsStore = useAssignmentsStore()
const editAssignmentZodSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.union([z.literal("assignment"), z.literal("test/quiz")]),
    class: z.union([z.string(), z.literal("No Class")])
})
type editAssignmentSchema = z.infer<typeof editAssignmentZodSchema>
const startDate = new Date(props.assignment.startDate)
const dueDate = new Date(props.assignment.dueDate)
const createAssignmentStartDate = shallowRef(new CalendarDate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()))
const createAssignmentDueDate = shallowRef(new CalendarDate(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate()))
const createAssignmentEstimatedCompletionTimeHours = ref(Math.floor(props.assignment.estimatedCompletionMinutes / 60))
const createAssignmentEstimatedCompletionTimeMinutes = ref(props.assignment.estimatedCompletionMinutes % 60)
const editAssignmentState = reactive<Partial<editAssignmentSchema>>({
    title: props.assignment.title,
    description: (props.assignment.description == null) ? undefined : props.assignment.description,
    type: props.assignment.type,
    class: assignmentsStore.classes[assignmentsStore.classes.findIndex((item) => item.id == props.assignment.class)!]?.name ?? "No Class"
})

const showCreateClassModal = ref(false)
const createClassZodSchema = z.object({
    name: z.string(),
})
type createClassSchema = z.infer<typeof createClassZodSchema>
const createClassState = reactive<Partial<createClassSchema>>({})

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

function findClassIdByClassName(name: string) {
    if (name == "No Class") {
        return null
    }

    return assignmentsStore.classes.find(value => {
        return value.name == name
    })?.id
}

function findClassNameById(id: number | null) {
    if (id == null) {
        return "No Class"
    }

    return assignmentsStore.classes.find(value => {
        return value.id == id
    })?.name
}

async function onSubmit(event: FormSubmitEvent<editAssignmentSchema>) {
    const classId = findClassIdByClassName(event.data.class)
    const request = await client.assignment[":id"].$patch({
        json: {
            title: event.data.title,
            description: event.data.description,
            type: event.data.type,
            class: classId,
            estimatedCompletionMinutes: (createAssignmentEstimatedCompletionTimeHours.value * 60) + createAssignmentEstimatedCompletionTimeMinutes.value,

            dueDate: createAssignmentDueDate.value.toDate("EST").getTime(),
            startDate: createAssignmentStartDate.value.toDate("EST").getTime()
        },

        param: {
            id: props.assignment.id.toString()
        }
    })
    const json = await request.json()
    if (json.success == false) {
        toast.add({
            color: "error",
            title: "Something went wrong",
            description: json.data
        })
        return
    }

    if (json.data == "Nothing changed") {
        toast.add({
            color: "success",
            title: json.data,
        })
        return
    }

    assignmentsStore.updateAssignment(props.assignment.id, json.data)
    toast.add({
        color: "success",
        title: "Assignment updated hurrayyy!",
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
    showCreateClassModal.value = false
}

async function deleteAssignment(id: number) {
    const request = await client.assignment[':id'].$delete({
        param: {
            id: id.toString()
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
    toast.add({
        color: "success",
        title: "Assignment successfully deleted",
    })
    assignmentsStore.removeAssignment(id)

    showCreateClassModal.value = false
    showDeleteAssignmentModal.value = false
    return
}
</script>

<template>
    <UCard class="relative flex-none">
        <div class="flex flex-col gap-4">
            <div>
                <h1 class="">{{ props.assignment.title }}</h1>
                <p class="desc">{{ props.assignment.description }}</p>
                <br>
                <p class="flex gap-1 items-center">
                    <Icon name="bx:alarm" /> {{
                        convertMinutesToFormattedString(props.assignment.estimatedCompletionMinutes) }}
                </p>
                <p class="flex gap-1 items-center">
                    <Icon name="bx:calendar" /> {{ new Date(props.assignment.dueDate).toLocaleDateString() }}
                </p>
                <p class="flex gap-1 items-center" v-if="props.assignment.completionDate !== null">
                    <Icon name="bx:calendar-check" /> {{ new
                        Date(props.assignment.completionDate).toLocaleDateString() }}
                </p>
                <p>Class:
                    <UBadge color="secondary" :label="findClassNameById(props.assignment.class)" />
                </p>
            </div>
            <UButton class="w-fit" loading-auto @click="emit('toggleAssignment', props.assignment.id)">{{
                props.assignment.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
        </div>

        <UButton class="absolute top-0 right-0" icon="material-symbols:edit-square-outline-rounded" label="Edit"
            variant="ghost" @click="showEditAssignmentModal = true" />
        <UModal v-model:open="showEditAssignmentModal">
            <template #content>
                <UButton class="absolute top-0 right-0" icon="ix:trashcan" label="Delete assignment" variant="ghost"
                    color="error" @click="showDeleteAssignmentModal = true" />
                <UModal v-model:open="showDeleteAssignmentModal">
                    <template #content>
                        <div class="flex flex-col gap-4 p-4">
                            <p class="font-bold font-xl self-center">Are you sure?</p>

                            <div class="flex gap-4">
                                <UButton icon="material-symbols:edit-square-outline-rounded"
                                    label="Yes, delete the assignment" color="error" class="w-fit"
                                    @click="deleteAssignment(props.assignment.id)" :loading-auto="true" />
                                <UButton icon="material-symbols:edit-square-outline-rounded" class="w-fit"
                                    label="No, don't delete the assignment" color="neutral" variant="ghost"
                                    @click="showDeleteAssignmentModal = false" />
                            </div>
                        </div>
                    </template>
                </UModal>

                <div class="p-4">
                    <UForm :schema="editAssignmentZodSchema" :state="editAssignmentState" @submit="onSubmit"
                        class="flex flex-col gap-4">

                        <UFormField label="Title" required>
                            <UInput class="w-full" placeholder="World History assignment"
                                v-model="editAssignmentState.title" />
                        </UFormField>
                        <UFormField label="Description (optional)">
                            <UTextarea class="w-full" placeholder="For Mr. Smiths class"
                                v-model="editAssignmentState.description" />
                        </UFormField>

                        <UFormField label="Type" required>
                            <USelect v-model="editAssignmentState.type" :items="['assignment', 'test/quiz']"
                                class="w-48" />
                        </UFormField>

                        <UFormField label="Class (optional)">
                            <div class="flex gap-4">
                                <USelect v-model="editAssignmentState.class"
                                    :items="[...assignmentsStore.classes.map(a => a.name), 'No Class']" class="w-48" />

                                <UModal v-model:open="showCreateClassModal">
                                    <UButton @click="showCreateClassModal = true" label="Create class" color="neutral"
                                        variant="subtle" />

                                    <template #content>
                                        <div class="p-4">
                                            <UForm :schema="createClassZodSchema" :state="createClassState"
                                                @submit="onSubmitCreateClass">
                                                <UFormField label="Name">
                                                    <UInput placeholder="Science class"
                                                        v-model="createClassState.name" />
                                                </UFormField>

                                                <UButton type="submit">Create class</UButton>
                                            </UForm>
                                        </div>
                                    </template>
                                </UModal>
                            </div>
                        </UFormField>

                        <UFormField label="Estimated completion time" required>
                            <div class="flex gap-4">
                                <UInputNumber v-model="createAssignmentEstimatedCompletionTimeHours" :min="0" :step="1"
                                    :format-options="{
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
                            </div>
                        </UFormField>

                        <div class="flex gap-2">
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
    </UCard>
</template>

<style lang="scss"></style>
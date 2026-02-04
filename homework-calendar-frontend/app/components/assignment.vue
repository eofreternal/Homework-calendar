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
</script>

<template>
    <UCard class="relative flex-none">
        <h1>{{ props.assignment.title }}</h1>
        <p class="desc">{{ props.assignment.description }}</p>
        <br>
        <p>Estimated time: {{ convertMinutesToFormattedString(props.assignment.estimatedCompletionMinutes) }}</p>
        <p v-if="props.assignment.completionDate !== null">Date completed: {{ new
            Date(props.assignment.completionDate).toLocaleDateString() }}</p>
        <p>Due Date: {{ new Date(props.assignment.dueDate).toLocaleDateString() }}</p>
        <UButton loading-auto @click="emit('toggleAssignment', props.assignment.id)">{{
            props.assignment.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>

        <UModal>
            <UButton class="absolute top-0 right-0" icon="material-symbols:edit-square-outline-rounded" label="Edit"
                variant="ghost" />

            <template #content>
                <UContainer class="create-assignment-wrapper">
                    <UForm :schema="editAssignmentZodSchema" :state="editAssignmentState" @submit="onSubmit"
                        class="form">

                        <UFormField label="Title" required>
                            <UInput placeholder="World History assignment" v-model="editAssignmentState.title" />
                        </UFormField>
                        <UFormField label="Description (optional)">
                            <UTextarea placeholder="For Mr. Smiths class" v-model="editAssignmentState.description" />
                        </UFormField>

                        <UFormField label="Type" required>
                            <USelect v-model="editAssignmentState.type" :items="['assignment', 'test/quiz']"
                                class="w-48" />
                        </UFormField>

                        <UFormField label="Class (optional)">
                            <USelect v-model="editAssignmentState.class"
                                :items="[...assignmentsStore.classes.map(a => a.name), 'No Class']" class="w-48" />

                            <UModal v-model:open="showCreateClassModal">
                                <UButton @click="showCreateClassModal = true" label="Create class" color="neutral"
                                    variant="subtle" />

                                <template #content>
                                    <UForm :schema="createClassZodSchema" :state="createClassState"
                                        @submit="onSubmitCreateClass">
                                        <UFormField label="Name">
                                            <UInput placeholder="Science class" v-model="createClassState.name" />
                                        </UFormField>

                                        <UButton type="submit">Create class</UButton>
                                    </UForm>
                                </template>
                            </UModal>
                        </UFormField>

                        <UFormField label="Estimated completion time" class="estimated-completetion-time-container"
                            required>
                            <UInputNumber v-model="createAssignmentEstimatedCompletionTimeHours" :min="0" :step="1"
                                :format-options="{
                                    style: 'unit',
                                    unit: 'hour',
                                    unitDisplay: 'long',
                                }" />

                            <UInputNumber v-model="createAssignmentEstimatedCompletionTimeMinutes" :min="0" :max="60"
                                :step="1" :format-options="{
                                    style: 'unit',
                                    unit: 'minute',
                                    unitDisplay: 'long',
                                }" />
                        </UFormField>

                        <div class="flex gap-2">
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
    </UCard>
</template>

<style lang="scss"></style>
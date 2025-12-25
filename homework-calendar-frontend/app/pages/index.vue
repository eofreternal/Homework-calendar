<script setup lang="ts">
import { client } from '~/utils';
import { useUserDataStore } from '~/stores/userDataStore';
import type { InferResponseType } from 'hono';
import type { FormSubmitEvent } from '@nuxt/ui'
import z from 'zod';
import { CalendarDate } from '@internationalized/date'

const userDataStore = useUserDataStore()
const toast = useToast()

const assignments = ref<InferResponseType<typeof client.assignment.$get>["data"]>([])

const today = new Date()
const oneDayInTheFuture = new Date()
oneDayInTheFuture.setDate(oneDayInTheFuture.getDate() + 1);
const createAssignmentStartDate = shallowRef(new CalendarDate(today.getFullYear(), today.getMonth(), today.getDay()))
const createAssignmentDueDate = shallowRef(new CalendarDate(oneDayInTheFuture.getFullYear(), oneDayInTheFuture.getMonth(), oneDayInTheFuture.getDay()))
const createAssignmentZodSchema = z.object({
    title: z.string(),
    description: z.string(),
    type: z.union([z.literal("assignment"), z.literal("test/quiz")]),
})
type createAssignmentSchema = z.infer<typeof createAssignmentZodSchema>
const createAssignmentState = reactive<Partial<createAssignmentSchema>>({
    type: "assignment"
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

    const assignmentsRequest = await client.assignment.$get()
    const assignmentsJson = await assignmentsRequest.json()

    if (assignmentsJson.success == false) { //TODO: why isn't hono infering the authentication middleware return type?
        toast.add({
            color: "error",
            title: "Something went wrong",
            description: assignmentsJson.data
        })
        return
    }

    assignments.value = assignmentsJson.data
})

async function onSubmitCreateAssignment(event: FormSubmitEvent<createAssignmentSchema>) {
    toast.add({ title: "got it " })
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
</script>

<template>
    <UContainer>
        <UModal>
            <UButton>Create assignment</UButton>

            <template #content>
                <UForm :schema="createAssignmentZodSchema" :state="createAssignmentState"
                    @submit="onSubmitCreateAssignment">

                    <UFormField label="Title">
                        <UInput placeholder="World History assignment" v-model="createAssignmentState.title" />
                    </UFormField>
                    <UFormField label="Description">
                        <UTextarea placeholder="For Mr. Smiths class" v-model="createAssignmentState.description" />
                    </UFormField>

                    <UFormField label="Start Date">
                        <UInputDate v-model="createAssignmentStartDate" />
                    </UFormField>

                    <UFormField label="Due Date">
                        <UInputDate v-model="createAssignmentDueDate" />
                    </UFormField>

                    <UButton type="submit">
                        Submit
                    </UButton>
                </UForm>
            </template>
        </UModal>
    </UContainer>
    <aside>
        <UCard v-for="work in assignments">
            <h1>{{ work.title }}</h1>
            <p>{{ work.description }}</p>

            <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
            <UButton>Mark as completed</UButton>
        </UCard>
    </aside>
</template>

<style lang="scss"></style>
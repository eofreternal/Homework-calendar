<script setup lang="ts">
import { client } from '~/utils';
import { useUserDataStore } from '~/stores/userDataStore';
import type { InferResponseType } from 'hono';
const userDataStore = useUserDataStore()
const toast = useToast()

const assignments = ref<InferResponseType<typeof client.assignment.$get>["data"]>([])

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
</script>

<template>
    <UContainer>
        <UModal>
            <UForm>

            </UForm>
        </UModal>
    </UContainer>
    <aside>
        <div v-for="work in assignments">
            <h1>{{ work.title }}</h1>
            <p>{{ work.description }}</p>

            <p>Due Date: {{ new Date(work.dueDate).toLocaleDateString() }}</p>
            <UButton>Mark as completed</UButton>
        </div>
    </aside>
</template>

<style lang="scss"></style>
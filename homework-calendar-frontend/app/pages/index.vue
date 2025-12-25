<script setup lang="ts">
import { client } from '~/utils';
import { useUserDataStore } from '~/stores/userDataStore';
const userDataStore = useUserDataStore()

const toast = useToast()

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
        color: "info",
        title: "Logged in"
    })
    userDataStore.setLoggedIn(true)
    userDataStore.setData(json.data) //TODO: why does typescript think this can be undefined?
})
</script>

<template>
    <UContainer>
    </UContainer>
</template>

<style lang="scss"></style>
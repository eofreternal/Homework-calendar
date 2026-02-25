<script setup lang="ts">
import { z } from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui'
import { useUserDataStore } from '~/stores/userDataStore';
import { client } from "~/utils"

const toast = useToast()
const userDataStore = useUserDataStore()
const signUpAndSignInZodSchema = z.object({
    username: z.string(),
    password: z.string()
})
const loggedIn = ref(false)
type signUpAndSignInSchema = z.infer<typeof signUpAndSignInZodSchema>

const signUpState = reactive<Partial<signUpAndSignInSchema>>({})
const logInState = reactive<Partial<signUpAndSignInSchema>>({})

async function signUp(event: FormSubmitEvent<signUpAndSignInSchema>) {
    const request = await client.auth.register.$post({
        json: {
            username: event.data.username,
            password: event.data.password
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
    userDataStore.setLoggedIn(true)
    userDataStore.setData({ username: json.data.username })
}

async function logIn(event: FormSubmitEvent<signUpAndSignInSchema>) {
    const request = await client.auth.login.$post({
        json: {
            username: event.data.username,
            password: event.data.password
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
    userDataStore.setLoggedIn(true)
    userDataStore.setData(json.data)
}

async function logout() {
    const request = await client.auth.logout.$get()

    reloadNuxtApp()
}

userDataStore.$subscribe((mutation, state) => {
    loggedIn.value = state.loggedIn
})
</script>

<template>
    <nav>
        <div class="flex gap-8">
            <NuxtLink to="/">Calendar</NuxtLink>
            <NuxtLink to="/classes">Classes</NuxtLink>
        </div>

        <div class="flex items-center">
            <div class="flex gap-2 items-center" v-if="!loggedIn">
                <UPopover>
                    <UButton class="h-fit" label="Log in" variant="ghost" />
                    <template #content>
                        <UForm :state="logInState" :schema="signUpAndSignInZodSchema" class="flex flex-col gap-2 p-4"
                            @submit="logIn">
                            <UFormField label="Username">
                                <UInput v-model="logInState.username" />
                            </UFormField>
                            <UFormField label="Password">
                                <UInput v-model="logInState.password" type="password" />
                            </UFormField>
                            <UButton class="w-fit" type="submit" label="Log in" />
                        </UForm>
                    </template>
                </UPopover>
                <span class="self-center">/</span>
                <UPopover>
                    <UButton class="h-fit" label="Sign up" variant="ghost" />
                    <template #content>
                        <UForm :state="signUpState" :schema="signUpAndSignInZodSchema" class="flex flex-col gap-2 p-4"
                            @submit="signUp">
                            <UFormField label="Username">
                                <UInput v-model="signUpState.username" />
                            </UFormField>
                            <UFormField label="Password">
                                <UInput v-model="signUpState.password" type="password" />
                            </UFormField>
                            <UButton class="w-fit" type="submit" label="Sign up" />
                        </UForm>
                    </template>
                </UPopover>
            </div>
        </div>

        <UButton v-if="loggedIn" label="Log out" @click="logout" color="error" variant="ghost" />
    </nav>
</template>

<style lang="scss" scoped>
nav {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 1.5rem;

    height: var(--navbar-height);

    a {
        font-size: 1.75rem;
        font-weight: 600;
    }
}
</style>
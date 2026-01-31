<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { InferResponseType } from 'hono';
import { client } from '~/utils';
import * as z from "zod"

const toast = useToast()
const route = useRoute("class-id")
const classData = ref<Extract<InferResponseType<typeof client.classes[":id"]["$get"]>, { success: true }>["data"]>()
const showEditModal = ref(false)

const editModalZodSchema = z.object({
    name: z.string().optional(),

    archiveDate: z.number().optional()
})

async function setArchivedStatus(id: number, setAsArchived: boolean) {
    if (classData.value == undefined) { return }

    const now = Date.now()
    const request = await client.classes[':id'].$patch({
        json: {
            archiveDate: setAsArchived ? now : null
        },

        param: {
            id: id.toString()
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

    classData.value.archiveDate = now
}

async function onSubmit(event: FormSubmitEvent<z.infer<typeof editModalZodSchema>>) {
    if (classData.value == undefined) { return }

    if (event.data.name) {
        classData.value!.name = event.data.name
    }
    if (event.data.archiveDate) {
        classData.value!.archiveDate = event.data.archiveDate
    }
}

async function main() {
    const request = await client.classes[':id'].$get({
        param: {
            id: route.params.id
        },

        query: {
            page: "1"
        }
    })
    const json = await request.json()

    if (json.success == false) {
        throw new Error(json.data)
    }

    classData.value = json.data
}
main()
</script>

<template>
    <main v-if="classData" class="flex flex-col gap-16">
        <header class="flex flex-col items-center">
            <div class="flex gap-16 w-fit">
                <h1 class="text-4xl font-bold">{{ classData.name }}</h1>

                <div class="flex flex-row gap-4 justify-end">
                    <UButton icon="material-symbols:edit-square-outline-rounded" label="Edit"
                        :title="'edit class' + classData.name" @click="showEditModal = true" />

                    <UButton icon="uil:archive"
                        :title="!classData.archiveDate ? 'Archive' : 'Unarchive' + ' class ' + classData.name"
                        :label="!classData.archiveDate ? 'Archive' : 'Unarchive'"
                        @click="setArchivedStatus(classData.id, true)" />
                </div>
            </div>

            <div class="w-fit">
                <p>{{ new Intl.DateTimeFormat("en-US", {
                    dateStyle: "long"
                }).format(classData.creationDate) }}</p>
            </div>
        </header>

        <UContainer class="flex flex-col gap-2">
            <UCard v-for="work in classData.assignments" :key="work.id">
                <p>{{ work.title }}</p>
                <p>{{ new Date(work.dueDate) }}</p>
            </UCard>
        </UContainer>
    </main>

    <ClassesEdit v-model:show="showEditModal" :class-id="(classData == undefined) ? null : classData.id"
        @on-submit="onSubmit" />
</template>
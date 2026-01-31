<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { InferResponseType } from 'hono';
import { client } from '~/utils';
import { z } from "zod"

const toast = useToast()

const allClasses = ref<Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"]>([]);
const classesToShow = computed(() => {
    const temp = {
        "active": [],
        "archived": []
    } as {
        "active": Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"],
        "archived": Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"]
    };

    for (const cls of allClasses.value) {
        if (cls.archiveDate) {
            temp.archived.push(cls)
            continue;
        }

        temp.active.push(cls)
    }

    return [...temp.active, ...temp.archived]
})

const showEditModal = ref(false)
const editModalZodSchema = z.object({
    name: z.string().optional(),

    archiveDate: z.number().optional()
})
const selectedClassForEditModal = ref<Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"][number] | null>(null)
const editModelState = reactive<Partial<z.infer<typeof editModalZodSchema>>>({})

onMounted(async () => {
    const requests = await client.classes.$get();
    const json = await requests.json()
    // will be needed in the near future
    // if (json.success == false) {
    //     toast.add({
    //         color: "error",
    //         title: "Something went wrong",
    //         description: json.data
    //     })
    //     return
    // }

    allClasses.value = json.data
})

async function deleteClass(id: number) {
    const i = allClasses.value.findIndex((item) => item.id === id)
    allClasses.value.splice(i, 1)
}

async function setArchivedStatus(id: number, setAsArchived: boolean) {
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

    const i = allClasses.value.findIndex((item) => item.id === id)
    allClasses.value[i]!.archiveDate = setAsArchived ? now : null
}

function openEditModal(data: Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"][number]) {
    showEditModal.value = true

    selectedClassForEditModal.value = data
    editModelState.name = data.name
}

async function onSubmit(event: FormSubmitEvent<z.infer<typeof editModalZodSchema>>) {
    const i = allClasses.value.findIndex((item) => item.id === selectedClassForEditModal.value.id)
    if (i == undefined) {
        toast.add({
            color: "error",
            title: "Something went wrong",
            description: "Error updating UI. Could not find class in allClasses array via ID"
        })
        return
    }

    if (event.data.name) {
        allClasses.value[i]!.name = event.data.name
    }
    if (event.data.archiveDate) {
        allClasses.value[i]!.archiveDate = event.data.archiveDate
    }
}
</script>

<template>
    <main
        class="grid gap-8 auto-rows-auto grid-cols-[repeat(auto-fit,minmax(448px,max-content))] justify-center items-center pl-20 pr-20 pt-0 pb-0"
        v-auto-animate>
        <div class="flex justify-center items-center" v-for="data in classesToShow" :key="data.id">
            <UCard class='relative min-w-md max-w-md' :ui="{
                body: 'flex flex-col gap-4'
            }" role="button">
                <UBadge label="Archived" color="warning" v-show="!!data.archiveDate" class="absolute top-0 right-0" />
                <header class="flex justify-between">
                    <NuxtLink :to="'/class/' + data.id">{{ data.name }}</NuxtLink>
                    <p>{{ data.numberOfAssignments == 0 ? "No assignments" : `${data.numberOfAssignments} assignments`
                    }}</p>
                </header>

                <div class="flex flex-row gap-4 justify-end">
                    <UButton icon="material-symbols:edit-square-outline-rounded" label="Edit"
                        :title="'edit class' + data.name" @click="openEditModal(data)" />

                    <UButton icon="uil:archive"
                        :title="!data.archiveDate ? 'Archive' : 'Unarchive' + ' class ' + data.name"
                        :label="!data.archiveDate ? 'Archive' : 'Unarchive'"
                        @click="() => setArchivedStatus(data.id, !data.archiveDate)" />
                </div>

                <footer>
                    <p>{{ new Date(data.creationDate).toLocaleDateString("us-EN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }) }}</p>
                </footer>
            </UCard>
        </div>
    </main>

    <ClassEdit v-model:show="showEditModal"
        :class-id="(selectedClassForEditModal == undefined) ? null : selectedClassForEditModal.id"
        @on-delete="deleteClass" @on-submit="onSubmit" />
</template>
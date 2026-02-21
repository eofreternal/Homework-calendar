<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { InferResponseType } from 'hono';
import { client } from '~/utils';
import { z } from "zod"
import { useAssignmentsStore } from "~/stores/assignmentsStore"

const assignmentStore = useAssignmentsStore()

const toast = useToast()

const classesToShow = ref<Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"]>([])

const showEditModal = ref(false)
const editModalZodSchema = z.object({
    name: z.string().optional(),

    archiveDate: z.number().optional()
})
const selectedClassForEditModal = ref<Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"][number] | null>(null)

onMounted(async () => {
    await assignmentStore.fetchClasses()
})

assignmentStore.$subscribe((mutation, state) => {
    const temp = {
        "active": [],
        "archived": []
    } as {
        "active": Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"],
        "archived": Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"]
    };

    for (const cls of state.classes) {
        if (cls.archiveDate) {
            temp.archived.push(cls)
            continue;
        }

        temp.active.push(cls)
    }

    classesToShow.value = [...temp.active, ...temp.archived]
})

async function deleteClass(id: number) {
    assignmentStore.removeClass(id)

    showEditModal.value = false
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

    assignmentStore.updateClass(id, { archiveDate: setAsArchived ? now : null })
}

function openEditModal(data: Extract<InferResponseType<typeof client.classes.$get>, { success: true }>["data"][number]) {
    showEditModal.value = true

    selectedClassForEditModal.value = data
}

async function onSubmit(event: FormSubmitEvent<z.infer<typeof editModalZodSchema>>) {
    if (event.data.name) {
        assignmentStore.updateClass(selectedClassForEditModal.value!.id, { name: event.data.name })
    }
    if (event.data.archiveDate) {
        assignmentStore.updateClass(selectedClassForEditModal.value!.id, { archiveDate: event.data.archiveDate })
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
                    <p>{{ data.numberOfAssignments == 0 ? "No assignments" : (`${data.numberOfAssignments} assignment` +
                        (data.numberOfAssignments == 1 ? "" : "s"))
                        }}</p>
                </header>

                <div class="flex flex-row gap-4 justify-end">
                    <UButton icon="material-symbols:edit-square-outline-rounded" label="Edit"
                        :title="'edit class' + data.name" @click="openEditModal(data)" color="neutral"
                        variant="subtle" />

                    <UButton icon="uil:archive"
                        :title="!data.archiveDate ? 'Archive' : 'Unarchive' + ' class ' + data.name"
                        :label="!data.archiveDate ? 'Archive' : 'Unarchive'" color="warning" variant="subtle"
                        @click="() => setArchivedStatus(data.id, !data.archiveDate)" />

                    <UPopover mode="hover">
                        <UButton icon="mdi:information-symbol" color="neutral" variant="subtle" />

                        <template #content>
                            <div class="flex flex-col gap-4 p-8">
                                <p><span class="text-slate-400">Creation date: </span>{{ new
                                    Date(data.creationDate).toLocaleDateString("us-EN", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    }) }}</p>
                            </div>
                        </template>
                    </UPopover>
                </div>
            </UCard>
        </div>
    </main>

    <ClassEdit v-model:show="showEditModal"
        :class-data="(selectedClassForEditModal == undefined) ? null : { id: selectedClassForEditModal.id, numberOfAssignments: selectedClassForEditModal.numberOfAssignments }"
        @on-delete="deleteClass" @on-submit="onSubmit" />
</template>
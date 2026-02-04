<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { client } from '~/utils';
import { z } from "zod"

const toast = useToast()
const emit = defineEmits(["onSubmit", "onDelete"])
const props = defineProps<{
    classId: number | null
}>()
const show = defineModel<boolean>("show")

const editModalZodSchema = z.object({
    name: z.string().optional(),

    archiveDate: z.number().optional().nullable()
})
const editModelState = reactive<Partial<z.infer<typeof editModalZodSchema>>>({})

async function onSubmit(event: FormSubmitEvent<z.infer<typeof editModalZodSchema>>) {
    if (props.classId == null) { return; }

    const request = await client.classes[':id'].$patch({
        json: {
            name: event.data.name,

            archiveDate: event.data.archiveDate
        },

        param: {
            id: props.classId.toString()
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

    emit("onSubmit", event)
}

async function deleteClass(id: number | null) {
    if (id == null) { return; }

    const request = await client.classes[":id"].$delete({
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

    emit("onDelete", id)
}

watch(() => props.classId, async (classId) => {
    console.log(props)
    if (classId == null) { return }

    const request = await client.classes[':id'].$get({
        param: {
            id: classId.toString()
        },

        query: {
            page: "1"
        }
    })
    const json = await request.json()
    if (json.success == false) {
        return
    }

    editModelState.name = json.data.name
    editModelState.archiveDate = json.data.archiveDate
})
</script>

<template>
    <UModal v-model:open="show" :title="'Edit class ' + editModelState.name">
        <template #body>
            <UForm :schema="editModalZodSchema" :state="editModelState" @submit="onSubmit">
                <UFormField label="Name" name="name">
                    <UInput v-model="editModelState.name" type="text" />
                </UFormField>

                <UButton type="submit">
                    Submit
                </UButton>
            </UForm>

            <UModal>
                <UButton color="error" icon="mdi:trash-can-outline" label="Delete" />

                <template #body>
                    <p>If this class is over, you should archive it instead of deleting the class to
                        keep the history of all your assignments
                        <template v-if="!!editModelState.archiveDate">
                            (It's already archived!)
                        </template>
                    </p>
                    <UButton icon="uil:archive"
                        :title="!editModelState.archiveDate ? 'Archive' : 'Unarchive' + ' class ' + editModelState.name"
                        :label="!editModelState.archiveDate ? 'Archive' : 'Unarchive'"
                        @click="onSubmit({ data: { archiveDate: Date.now() } } as FormSubmitEvent<z.infer<typeof editModalZodSchema>>)" />

                    <div class="flex flex-row gap-4">
                        <UButton class="error" label="Yes, I'm sure" color="success"
                            @click="deleteClass(props.classId!)" />
                    </div>
                </template>
            </UModal>
        </template>
    </UModal>
</template>
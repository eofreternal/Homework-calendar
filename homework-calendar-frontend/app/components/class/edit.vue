<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { client } from '~/utils';
import { z } from "zod"
import { useAssignmentsStore } from "~/stores/assignmentsStore"

const assignmentStore = useAssignmentsStore()
const toast = useToast()
const emit = defineEmits(["onSubmit", "onDelete"])
const props = defineProps<{
    classData: { id: number, numberOfAssignments: number } | null
}>()
const show = defineModel<boolean>("show")
const showWhatToDoWithAssignmentsModal = ref(false)
const className = ref("No Class")

const editModalZodSchema = z.object({
    name: z.string().optional(),

    archiveDate: z.number().optional().nullable()
})
const editModelState = reactive<Partial<z.infer<typeof editModalZodSchema>>>({})

async function onSubmit(event: FormSubmitEvent<z.infer<typeof editModalZodSchema>>) {
    if (props.classData?.id == null) { return; }

    const request = await client.classes[':id'].$patch({
        json: {
            name: event.data.name,

            archiveDate: event.data.archiveDate
        },

        param: {
            id: props.classData?.id.toString()
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

function findClassIdByClassName(name: string) {
    if (name == "No Class") {
        return undefined
    }

    return assignmentStore.classes.find(value => {
        return value.name == name
    })?.id
}

//I know this is bad. Tell future-me to fix it
async function deleteClass(id: number | null, action: "reassignToClass" | "delete" | undefined, className: string | undefined) {
    if (id == null) { return; }
    if (props.classData!.numberOfAssignments > 0 && action == undefined) {
        console.log("setting showWhatToDoWithAssignmentsModal to true")
        showWhatToDoWithAssignmentsModal.value = true
        return
    }

    const request = await client.classes[":id"].$delete({
        param: {
            id: id.toString()
        },

        query: {
            actionToDoWithTheAssignments: action,
            reassignToClass: className ? findClassIdByClassName(className) : undefined
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

    showWhatToDoWithAssignmentsModal.value = false
    emit("onDelete", id)
}

watch(() => props.classData?.id, async (classId) => {
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
                            @click="deleteClass(props.classData!.id, undefined, undefined)" />
                    </div>

                    <UModal v-model:open="showWhatToDoWithAssignmentsModal">
                        <template #body>
                            <p>There are {{ props.classData?.numberOfAssignments }} assignments linked to this class.
                                What do you want to do with them?</p>

                            <UContainer>
                                <UButton @click="deleteClass(props.classData!.id, 'delete', undefined)">Delete them
                                </UButton>
                                <UButton @click="deleteClass(props.classData!.id, 'reassignToClass', undefined)">
                                    Reassign
                                    them to no class</UButton>

                                <div class="flex gap-4">
                                    <UButton @click="deleteClass(props.classData!.id, 'reassignToClass', className)">
                                        Reassign
                                        them to a class
                                    </UButton>

                                    <USelect v-model="className"
                                        :items="[...assignmentStore.classes.map(a => a.name), 'No Class']"
                                        class="w-48" />
                                </div>
                            </UContainer>
                        </template>
                    </UModal>
                </template>
            </UModal>
        </template>
    </UModal>
</template>
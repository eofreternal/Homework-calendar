<script setup lang="ts">
import { useAssignmentsStore } from "~/stores/assignmentsStore"
const assignmentsStore = useAssignmentsStore()

type SortByOptions = "Due date" | "Time to complete"
const sortByOptions = ["Due date", "Time to complete"] as SortByOptions[]
const sidebarSortBy = ref<SortByOptions[]>([])
const props = defineProps<{
    mobile: boolean,
    toggleAssignmentAsCompleted: (id: number) => void
}>()

const assignments = ref(assignmentsStore.assignments)
const assignmentsToShow = computed(() => {
    const temp = [...assignments.value]

    for (let i = 0; i < sidebarSortBy.value.length; i++) {
        if (sidebarSortBy.value[i] == "Due date") {
            temp.sort((a, b) => {
                return a.dueDate - b.dueDate
            })
        }

        if (sidebarSortBy.value[i] == "Time to complete") {
            temp.sort((a, b) => {
                return a.estimatedCompletionMinutes - b.estimatedCompletionMinutes
            })
        }
    }

    return temp
})

assignmentsStore.$subscribe((mutation, state) => {
    assignments.value = state.assignments
})
</script>

<template>
    <!-- subtract 1rem for the padding added to the top of the main element -->
    <aside class="flex flex-col max-h-[calc(100dvh-var(--navbar-height)-1rem)]" :class="{ 'mobile': props.mobile }">
        <div class="flex items-center gap-2">
            <span class="shrink-0">Sort by:</span>
            <USelect v-model="sidebarSortBy" :items="sortByOptions" multiple class="min-w-0 flex-1" />
        </div>
        <UTabs :items="[
            {
                label: 'Uncompleted',
                slot: 'uncompleted'
            },
            {
                label: 'Completed',
                slot: 'completed'
            }
        ]" class="flex-1 min-h-0" :ui="{
            content: 'flex-1 min-h-0'
        }">
            <!-- `pr-0.5 pl-0.5` are used here to give some wiggle room for the scrollbar if it appears. If it doesnt appear, its only applying 4px of padding so its fine -->
            <template #uncompleted>
                <div class="flex flex-col gap-4 h-full overflow-y-scroll pr-0.5 pl-0.5">
                    <Assignment v-for="work in assignmentsToShow" :key="work.id" v-show="work.completionDate == null"
                        :assignment="work" @toggle-assignment="toggleAssignmentAsCompleted" />
                </div>
            </template>

            <template #completed>
                <div class="flex flex-col gap-4 h-full overflow-y-scroll pr-0.5 pl-0.5">
                    <Assignment v-for="work in assignmentsToShow" :key="work.id" v-show="work.completionDate !== null"
                        :assignment="work" @toggle-assignment="toggleAssignmentAsCompleted" />
                </div>
            </template>
        </UTabs>
    </aside>
</template>

<style lang="scss">
aside {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    width: 24rem;
    background: var(--ui-bg);

    .desc {
        color: grey;
        font-size: 16px;
    }

    &.mobile {
        position: absolute;
        width: 100%;
        height: 100%;
    }
}
</style>
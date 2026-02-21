<script setup lang="ts">
import { client } from '~/utils';
import type { InferResponseType } from 'hono';

const props = defineProps<{
    assignments: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"],
    mobile: boolean,
    toggleAssignmentAsCompleted: (id: number) => void
}>()
</script>

<template>
    <aside :class="{ 'mobile': props.mobile }">
        <UTabs :items="[
            {
                label: 'Uncompleted',
                slot: 'uncompleted'
            },
            {
                label: 'Completed',
                slot: 'completed'
            }
        ]">
            <!-- `pr-0.5 pl-0.5` are used here to give some wiggle room for the scrollbar if it appears. If it doesnt appear, its only applying 4px of padding so its fine -->
            <!-- subtract 1rem for the padding added to the top of the main element, subtract 3rem for the top + bottom padding added to the navbar -->
            <template #uncompleted>
                <div
                    class="flex flex-col gap-4 max-h-[calc(100dvh-var(--navbar-height)-1rem-3rem)] overflow-y-scroll pr-0.5 pl-0.5">
                    <Assignment v-for="work in props.assignments" :key="work.id" v-show="work.completionDate == null"
                        :assignment="work" @toggle-assignment="toggleAssignmentAsCompleted" />
                </div>
            </template>

            <template #completed>
                <div
                    class="flex flex-col gap-4 max-h-[calc(100dvh-var(--navbar-height)-1rem-3rem)] overflow-y-scroll pr-0.5 pl-0.5">
                    <Assignment v-for="work in props.assignments" :key="work.id" v-show="work.completionDate !== null"
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

    top: 0px;
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
<script setup lang="ts">
import { client } from '~/utils';
import type { InferResponseType } from 'hono';

const props = defineProps<{
    day: number | null,
    assignmentsForDay: Extract<
        InferResponseType<typeof client.assignment["$get"]>,
        { success: true }
    >["data"],

    showAssignmentsForDayFunc: (day: number, assignments: Extract<
        InferResponseType<typeof client.assignment["$get"]>,
        { success: true }
    >["data"]) => void
}>()
</script>

<template>
    <div class="day"
        @click="() => { if (props.day !== null) { showAssignmentsForDayFunc(props.day, props.assignmentsForDay) } }"
        :class="{ 'has-assignments': props.assignmentsForDay.filter(item => item.completionDate == null).length > 0, 'today': new Date().getDate() == props.day }">
        {{ props.day }}

        <ul>
            <li v-for="(item, index) in props.assignmentsForDay" v-show="index < 3" :key="index" class="assignment"
                :class="{ 'strikethrough': item.completionDate !== null }">
                {{ item.title }}
            </li>
            <li v-if="props.assignmentsForDay.length > 3">
                +{{ props.assignmentsForDay.length - 3 }} more items
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
.day {
    box-sizing: border-box;

    padding: 0.5rem;
    min-height: 120px;
    width: 160px;
    max-width: 100%;

    border-radius: 8px;

    overflow: hidden;

    padding: 1rem;

    &.has-assignments {
        border: 3px solid var(--ui-primary);
    }

    &.today {
        border: 3px solid white;
    }

    .assignment {
        font-size: 12px;

        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &.strikethrough {
            text-decoration: line-through;
        }
    }
}
</style>
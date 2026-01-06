<script setup lang="ts">
import { client } from '~/utils';
import type { InferResponseType } from 'hono';

const emit = defineEmits<{
    (event: 'showAssignmentsForDay', day: number, assignments: Extract<
        InferResponseType<typeof client.assignment["$get"]>,
        { success: true }
    >["data"]): void;
}>();

const props = defineProps<{
    day: number | null,
    assignmentsForDay: Extract<
        InferResponseType<typeof client.assignment["$get"]>,
        { success: true }
    >["data"]
}>()

function onClick() {
    if (props.day !== null) {
        emit("showAssignmentsForDay", props.day, props.assignmentsForDay)
    }
}

const hasIncomplete = computed(
    () => props.assignmentsForDay.some(a => a.completionDate == null)
)

const isToday = computed(
    () => props.day !== null && new Date().getDate() === props.day
)
</script>

<template>
    <div class="day" @click="onClick" :class="{ 'has-assignments': hasIncomplete, 'today': isToday }">
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
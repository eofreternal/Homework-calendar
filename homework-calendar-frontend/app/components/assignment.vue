<script setup lang="ts">
import { client } from '~/utils';
import type { InferResponseType } from 'hono';

const props = defineProps<{
    assignment: Extract<InferResponseType<typeof client.assignment["$get"]>, { success: true }>["data"][number],
    toggleAssignmentAsCompletedFunc: (id: number) => void
}>()

function convertMinutesToFormattedString(minutes: number) {
    const normalizedHours = Math.floor(minutes / 60)
    const normalizedMinutes = minutes % 60

    if (normalizedHours < 1) {
        return `${normalizedMinutes} minute${normalizedMinutes == 1 ? "" : "s"}`
    }

    if (normalizedMinutes < 1) {
        return `${normalizedHours} hour${normalizedHours == 1 ? "" : "s"}`
    }

    return `${normalizedHours} hour${normalizedHours == 1 ? "" : "s"} and ${normalizedMinutes} minute${normalizedMinutes == 1 ? "" : "s"}`
}
</script>

<template>
    <UCard>
        <h1>{{ props.assignment.title }}</h1>
        <p class="desc">{{ props.assignment.description }}</p>
        <br>
        <p>Estimated time: {{ convertMinutesToFormattedString(props.assignment.estimatedCompletionMinutes) }}</p>
        <p v-if="props.assignment.completionDate !== null">Date completed: {{ new
            Date(props.assignment.completionDate).toLocaleDateString() }}</p>
        <p>Due Date: {{ new Date(props.assignment.dueDate).toLocaleDateString() }}</p>
        <UButton loading-auto @click="() => toggleAssignmentAsCompletedFunc(props.assignment.id)">{{
            props.assignment.completionDate ? "Unmark as completed" : "Mark as completed" }}</UButton>
    </UCard>
</template>

<style lang="scss"></style>
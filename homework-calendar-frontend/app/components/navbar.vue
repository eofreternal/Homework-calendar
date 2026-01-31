<script setup lang="ts">
</script>

<template>
    <nav>
        <NuxtLink to="/">Calendar</NuxtLink>
        <NuxtLink to="/classes">Classes</NuxtLink>
    </nav>
</template>

<style lang="scss" scoped>
nav {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    height: var(--navbar-height);

    padding: 1.5rem;

    a {
        font-size: 1.75rem;
        font-weight: 600;
    }
}
</style>
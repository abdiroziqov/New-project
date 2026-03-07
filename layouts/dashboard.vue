<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="lg:pl-64">
      <AppHeader @toggle-sidebar="sidebarOpen = true" />

      <main class="space-y-6 p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

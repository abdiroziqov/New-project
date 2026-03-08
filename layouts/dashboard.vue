<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-slate-100">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="min-w-0 lg:pl-64">
      <AppHeader @toggle-sidebar="sidebarOpen = true" />

      <main class="min-w-0 space-y-6 overflow-x-hidden p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue'
import AppSidebar from '~/components/layout/AppSidebar.vue'

const mobileSidebarOpen = ref(false)
const desktopSidebarOpen = useState('layout:desktop-sidebar-open', () => true)

const toggleSidebar = () => {
  if (window.matchMedia('(min-width: 1024px)').matches) {
    desktopSidebarOpen.value = !desktopSidebarOpen.value
    return
  }

  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

const closeSidebar = () => {
  mobileSidebarOpen.value = false
}
</script>

<template>
  <div class="min-h-screen overflow-x-hidden bg-slate-100">
    <AppSidebar :open="mobileSidebarOpen" :desktop-open="desktopSidebarOpen" @close="closeSidebar" />

    <div :class="['min-w-0 transition-[padding] duration-200', desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0']">
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <main class="min-w-0 space-y-6 overflow-x-hidden p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

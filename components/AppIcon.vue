<script setup lang="ts">
type IconName =
  | 'dashboard'
  | 'quick-entry'
  | 'manual-entry'
  | 'production'
  | 'raw-materials'
  | 'suppliers'
  | 'inventory'
  | 'sales'
  | 'debtors'
  | 'expenses'
  | 'reports'
  | 'clients'

interface Props {
  name: IconName
}

defineProps<Props>()
</script>

<template>
  <svg
    v-if="name === 'dashboard'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </svg>

  <svg
    v-else-if="name === 'quick-entry'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
    <rect x="3" y="3" width="18" height="18" rx="4" />
  </svg>

  <svg
    v-else-if="name === 'manual-entry'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M7 10h10" />
    <path d="M7 14h4" />
    <path d="M17 3v4" />
    <path d="M7 18v3" />
  </svg>

  <svg
    v-else-if="name === 'production'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19h16" />
    <path d="M6 19V9l6-4 6 4v10" />
    <path d="M9 19v-4h6v4" />
    <path d="M8 11h.01" />
    <path d="M12 11h.01" />
    <path d="M16 11h.01" />
  </svg>

  <svg
    v-else-if="name === 'raw-materials'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M3 16.5 12 4l9 12.5" />
    <path d="M6.5 16.5h11" />
    <path d="M5 20h14" />
  </svg>

  <svg
    v-else-if="name === 'suppliers'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7h11v8H3z" />
    <path d="M14 10h3l4 3v2h-2" />
    <circle cx="7.5" cy="18" r="2" />
    <circle cx="17.5" cy="18" r="2" />
    <path d="M14 18H9.5" />
    <path d="M21 15v3" />
  </svg>

  <svg
    v-else-if="name === 'sales'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 17 10 11l4 4 6-8" />
    <path d="M20 10V7h-3" />
    <path d="M4 20h16" />
  </svg>

  <svg
    v-else-if="name === 'inventory'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z" />
    <path d="M3 12 12 16.5 21 12" />
    <path d="M3 16.5 12 21l9-4.5" />
  </svg>

  <svg
    v-else-if="name === 'debtors'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M7 10h10" />
    <path d="M7 14h4" />
    <path d="M16.5 13.5 18 15l2.5-3" />
  </svg>

  <svg
    v-else-if="name === 'expenses'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v18" />
    <path d="M17 7.5c0-1.9-1.8-3.5-4.5-3.5S8 5.6 8 7.5 9.8 11 12.5 11 17 12.6 17 14.5 15.2 18 12.5 18 8 16.4 8 14.5" />
  </svg>

  <svg
    v-else-if="name === 'reports'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M14 3v5h5" />
    <path d="M9 14h6" />
    <path d="M9 17h6" />
    <path d="M9 11h2" />
  </svg>

  <svg
    v-else
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M16 19a4 4 0 0 0-8 0" />
    <circle cx="12" cy="11" r="4" />
    <path d="M5 19a3 3 0 0 1 3-3" />
    <path d="M19 19a3 3 0 0 0-3-3" />
  </svg>
</template>

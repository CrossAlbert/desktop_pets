<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
const router = useRouter()


window.electron.ipcRenderer.on('select-router',
  (_event, data: SelectRouterMessage) => {
    router.push(data);
  }
);


</script>

<template>
  <RouterView />
</template>

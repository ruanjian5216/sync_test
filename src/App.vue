<script setup lang="ts">
import ScreenShare from './components/ScreenShare.vue'
</script>

<template>
  <div class="app">
    <h1>桌面共享</h1>
    <ScreenShare />
  </div>
</template>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #2c3e50;
}
</style>

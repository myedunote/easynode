<template>
  <div v-if="visible" class="terminal_workspace_background" aria-hidden="true">
    <iframe
      v-if="background.mode === 'html'"
      class="terminal_workspace_background_html"
      :srcdoc="htmlTheme.html"
      sandbox=""
      tabindex="-1"
      title=""
    />
    <div
      v-else-if="imageSource"
      class="terminal_workspace_background_image"
      :style="imageStyle"
    />
    <div class="terminal_workspace_background_overlay" :style="overlayStyle" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import useStore from '@/store'
import api from '@/api'
import { getTerminalHtmlTheme } from '@/utils/terminal-html-themes'
import { hasDecorativeBackground, resolveOverlayColor, resolveThemeEntity } from '@/utils/terminal-settings'

const store = useStore()
const settings = computed(() => store.effectiveTerminalSettings)
const appearance = computed(() => settings.value.appearance)
const background = computed(() => appearance.value.background)
const visible = computed(() => hasDecorativeBackground(settings.value))
const htmlTheme = computed(() => getTerminalHtmlTheme(
  background.value.htmlThemeId,
  appearance.value.customHtmlThemes
))
const assetObjectUrl = ref('')
let assetLoadSequence = 0

const releaseAssetObjectUrl = () => {
  if (assetObjectUrl.value) URL.revokeObjectURL(assetObjectUrl.value)
  assetObjectUrl.value = ''
}

watch(
  () => [background.value.mode, background.value.assetId, background.value.previewUrl,],
  async([mode, assetId, previewUrl,]) => {
    const sequence = ++assetLoadSequence
    releaseAssetObjectUrl()
    if (mode !== 'image' || previewUrl || !assetId) return
    try {
      const blob = await api.getTerminalBackground(assetId)
      if (sequence !== assetLoadSequence) return
      assetObjectUrl.value = URL.createObjectURL(blob)
    } catch {
      assetObjectUrl.value = ''
    }
  },
  { immediate: true }
)

const imageSource = computed(() => background.value.previewUrl || assetObjectUrl.value)
const imageStyle = computed(() => ({
  backgroundImage: imageSource.value ? `url("${ imageSource.value }")` : 'none',
  backgroundPosition: background.value.position,
  backgroundRepeat: 'no-repeat',
  backgroundSize: background.value.fit === 'fill' ? '100% 100%' : background.value.fit
}))

const overlayStyle = computed(() => ({
  backgroundColor: `rgba(${ resolveOverlayColor(settings.value) }, ${ background.value.overlay.opacity })`
}))

const baseColor = computed(() => resolveThemeEntity(settings.value).colors.background || '#10151d')

onBeforeUnmount(() => {
  assetLoadSequence += 1
  releaseAssetObjectUrl()
})
</script>

<style lang="scss" scoped>
.terminal_workspace_background,
.terminal_workspace_background_html,
.terminal_workspace_background_image,
.terminal_workspace_background_overlay {
  position: absolute;
  inset: 0;
}

.terminal_workspace_background {
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: v-bind(baseColor);
}

.terminal_workspace_background_html {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}

.terminal_workspace_background_overlay { z-index: 1; }
</style>
